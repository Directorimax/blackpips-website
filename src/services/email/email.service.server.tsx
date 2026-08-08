import { Resend } from "resend";
import type { ReactElement } from "react";
import { WelcomeEmail } from "@/emails/WelcomeEmail";
import { PaymentApprovedEmail } from "@/emails/PaymentApprovedEmail";
import { CourseUnlockedEmail } from "@/emails/CourseUnlockedEmail";
import { MentorshipApprovedEmail } from "@/emails/MentorshipApprovedEmail";
import { MentorshipRejectedEmail } from "@/emails/MentorshipRejectedEmail";
import { CertificateEarnedEmail } from "@/emails/CertificateEarnedEmail";
import { AdminPaymentSubmittedEmail } from "@/emails/AdminPaymentSubmittedEmail";
import { AdminMentorshipSubmittedEmail } from "@/emails/AdminMentorshipSubmittedEmail";
import { PaymentRejectedEmail } from "@/emails/PaymentRejectedEmail";
import { AlcAccessDecisionEmail } from "@/emails/AlcAccessDecisionEmail";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { formatTZS } from "@/lib/site-data";

type NotificationType =
  | "welcome"
  | "payment_approved"
  | "course_unlocked"
  | "mentorship_approved"
  | "mentorship_rejected"
  | "certificate_earned"
  | "payment_submitted"
  | "payment_rejected"
  | "mentorship_submitted"
  | "alc_access_approved"
  | "alc_access_rejected";

type NotificationRequest = { type: NotificationType; resourceId: string; actorId: string };
type Recipient = { userId: string; email: string; name: string };
type NotificationLog = { id: string; status: string };

const APP_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const SUPPORT_EMAIL = process.env.BLACKPIPS_SUPPORT_EMAIL ?? "support@blackpips.com";
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL;
const WHATSAPP_URL = "https://wa.me/255693413655";

export async function sendNotification(
  request: NotificationRequest,
): Promise<{ delivered: boolean }> {
  const prepared = await prepareNotification(request);
  if (!prepared) return { delivered: false };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.error("[email] Resend configuration is missing.");
    throw new Error("Resend email configuration is incomplete.");
  }

  const log = await reserveDelivery(prepared.type, prepared.resourceId, prepared.recipient.email);
  if (!log) return { delivered: false };

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to: [prepared.recipient.email],
      subject: prepared.subject,
      react: prepared.react,
    });
    if (result.error) throw new Error(result.error.message);
    await updateDelivery(log.id, "sent", null);
    return { delivered: true };
  } catch (error) {
    console.error("[email] Resend request failed.");
    try {
      await updateDelivery(
        log.id,
        "failed",
        error instanceof Error ? error.message : "Unknown provider error",
      );
    } catch (deliveryLogError) {
      console.error("[email] Failed to record the delivery failure.");
      throw new AggregateError(
        [error, deliveryLogError],
        "Resend delivery failed and the notification log could not be updated.",
      );
    }
    throw error;
  }
}

async function prepareNotification(
  request: NotificationRequest,
): Promise<PreparedNotification | null> {
  switch (request.type) {
    case "welcome":
      return prepareWelcome(request);
    case "payment_approved":
      return preparePaymentApproved(request);
    case "course_unlocked":
      return prepareCourseUnlocked(request);
    case "mentorship_approved":
    case "mentorship_rejected":
      return prepareMentorshipDecision(request);
    case "certificate_earned":
      return prepareCertificateEarned(request);
    case "payment_submitted":
      return preparePaymentSubmitted(request);
    case "payment_rejected":
      return preparePaymentRejected(request);
    case "mentorship_submitted":
      return prepareMentorshipSubmitted(request);
    case "alc_access_approved":
    case "alc_access_rejected":
      return prepareAlcAccessDecision(request);
  }
}

async function prepareAlcAccessDecision(
  request: NotificationRequest,
): Promise<PreparedNotification | null> {
  if (!(await isAdmin(request.actorId))) return null;
  const expectedStatus = request.type === "alc_access_approved" ? "approved" : "rejected";
  const { data: accessRequest, error } = await supabaseAdmin
    .from("alc_access_requests")
    .select("id,user_id,full_name,email,status,public_review_message")
    .eq("id", request.resourceId)
    .eq("status", expectedStatus)
    .maybeSingle();
  if (error || !accessRequest) {
    if (error) console.error("[email] Unable to load reviewed ALC Access request.");
    return null;
  }
  const approved = expectedStatus === "approved";
  return {
    type: request.type,
    resourceId: accessRequest.id,
    recipient: {
      userId: accessRequest.user_id,
      email: accessRequest.email,
      name: accessRequest.full_name || "Trader",
    },
    subject: approved
      ? "Your BlackPips ALC Access request was approved"
      : "An update on your BlackPips ALC Access request",
    react: (
      <AlcAccessDecisionEmail
        studentName={accessRequest.full_name || "Trader"}
        approved={approved}
        publicMessage={accessRequest.public_review_message}
        accessUrl={`${APP_URL}/alc-access`}
      />
    ),
  };
}

async function preparePaymentSubmitted(
  request: NotificationRequest,
): Promise<PreparedNotification | null> {
  if (!ADMIN_NOTIFICATION_EMAIL || request.actorId === "") return null;
  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("id,user_id,course_id,amount,currency,transaction_id,proof_url,created_at")
    .eq("id", request.resourceId)
    .maybeSingle();
  if (!payment || payment.user_id !== request.actorId) return null;
  const [recipient, course] = await Promise.all([
    getRecipient(payment.user_id),
    supabaseAdmin.from("courses").select("title").eq("id", payment.course_id).maybeSingle(),
  ]);
  if (!recipient || !course.data) return null;
  return {
    type: "payment_submitted",
    resourceId: payment.id,
    recipient: { userId: "admin", email: ADMIN_NOTIFICATION_EMAIL, name: "BlackPips admin" },
    subject: "New course access request — BlackPips",
    react: (
      <AdminPaymentSubmittedEmail
        learnerName={recipient.name}
        learnerEmail={recipient.email}
        courseName={course.data.title}
        amount={
          payment.currency === "TZS"
            ? formatTZS(Number(payment.amount))
            : `${payment.currency} ${payment.amount}`
        }
        reference={payment.transaction_id ?? "Not provided"}
        reviewUrl={`${APP_URL}/admin/payments`}
      />
    ),
  };
}

async function preparePaymentRejected(
  request: NotificationRequest,
): Promise<PreparedNotification | null> {
  if (!(await isAdmin(request.actorId))) return null;
  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("id,user_id,course_id,status,rejection_reason")
    .eq("id", request.resourceId)
    .eq("status", "rejected")
    .maybeSingle();
  if (!payment) return null;
  const [recipient, course] = await Promise.all([
    getRecipient(payment.user_id),
    supabaseAdmin.from("courses").select("title").eq("id", payment.course_id).maybeSingle(),
  ]);
  if (!recipient || !course.data) return null;
  return {
    type: "payment_rejected",
    resourceId: payment.id,
    recipient,
    subject: "Update on your BlackPips course request",
    react: (
      <PaymentRejectedEmail
        studentName={recipient.name}
        courseName={course.data.title}
        reason={payment.rejection_reason}
        dashboardUrl={`${APP_URL}/dashboard`}
      />
    ),
  };
}

async function prepareMentorshipSubmitted(
  request: NotificationRequest,
): Promise<PreparedNotification | null> {
  if (!ADMIN_NOTIFICATION_EMAIL || request.actorId === "") return null;
  const { data: application } = await supabaseAdmin
    .from("mentorship_applications")
    .select("id,user_id,full_name,email,whatsapp_number,mentorship_package_id")
    .eq("id", request.resourceId)
    .maybeSingle();
  if (!application || application.user_id !== request.actorId) return null;
  const { data: packageData } = await supabaseAdmin
    .from("mentorship_packages")
    .select("name")
    .eq("id", application.mentorship_package_id)
    .maybeSingle();
  if (!packageData) return null;
  return {
    type: "mentorship_submitted",
    resourceId: application.id,
    recipient: { userId: "admin", email: ADMIN_NOTIFICATION_EMAIL, name: "BlackPips admin" },
    subject: "New mentorship application — BlackPips",
    react: (
      <AdminMentorshipSubmittedEmail
        learnerName={application.full_name}
        learnerEmail={application.email}
        whatsapp={application.whatsapp_number}
        packageName={packageData.name}
        reviewUrl={`${APP_URL}/admin/mentorship-applications`}
      />
    ),
  };
}

async function prepareWelcome(request: NotificationRequest): Promise<PreparedNotification | null> {
  if (request.actorId !== request.resourceId) return null;
  const recipient = await getRecipient(request.resourceId);
  if (!recipient) return null;
  return {
    type: "welcome",
    resourceId: request.resourceId,
    recipient,
    subject: "Welcome to BlackPips",
    react: <WelcomeEmail studentName={recipient.name} dashboardUrl={`${APP_URL}/dashboard`} />,
  };
}

async function preparePaymentApproved(
  request: NotificationRequest,
): Promise<PreparedNotification | null> {
  if (!(await isAdmin(request.actorId))) return null;
  const { data: payment, error } = await supabaseAdmin
    .from("payments")
    .select("id,user_id,course_id,amount,currency,status")
    .eq("id", request.resourceId)
    .eq("status", "approved")
    .maybeSingle();
  if (error || !payment) {
    if (error) console.error("[email] Unable to load approved payment.");
    return null;
  }
  const [recipient, course] = await Promise.all([
    getRecipient(payment.user_id),
    supabaseAdmin.from("courses").select("title").eq("id", payment.course_id).maybeSingle(),
  ]);
  if (!recipient || !course.data) return null;
  return {
    type: "payment_approved",
    resourceId: payment.id,
    recipient,
    subject: `Payment approved — ${course.data.title}`,
    react: (
      <PaymentApprovedEmail
        studentName={recipient.name}
        courseName={course.data.title}
        amount={formatTZS(Number(payment.amount))}
        dashboardUrl={`${APP_URL}/dashboard`}
      />
    ),
  };
}

async function prepareCourseUnlocked(
  request: NotificationRequest,
): Promise<PreparedNotification | null> {
  if (!(await isAdmin(request.actorId))) return null;
  const { data: payment, error } = await supabaseAdmin
    .from("payments")
    .select("id,user_id,course_id,status")
    .eq("id", request.resourceId)
    .eq("status", "approved")
    .maybeSingle();
  if (error || !payment) return null;
  const [recipient, course] = await Promise.all([
    getRecipient(payment.user_id),
    supabaseAdmin.from("courses").select("title").eq("id", payment.course_id).maybeSingle(),
  ]);
  if (!recipient || !course.data) return null;
  return {
    type: "course_unlocked",
    resourceId: payment.id,
    recipient,
    subject: `Course unlocked — ${course.data.title}`,
    react: (
      <CourseUnlockedEmail
        studentName={recipient.name}
        courseName={course.data.title}
        dashboardUrl={`${APP_URL}/dashboard`}
      />
    ),
  };
}

async function prepareMentorshipDecision(
  request: NotificationRequest,
): Promise<PreparedNotification | null> {
  if (!(await isAdmin(request.actorId))) return null;
  const { data: application, error } = await supabaseAdmin
    .from("mentorship_applications")
    .select("id,user_id,mentorship_package_id,full_name,email,status")
    .eq("id", request.resourceId)
    .maybeSingle();
  if (error || !application || application.status !== request.type.replace("mentorship_", "")) {
    if (error) console.error("[email] Unable to load mentorship application.");
    return null;
  }
  const { data: packageData } = await supabaseAdmin
    .from("mentorship_packages")
    .select("name")
    .eq("id", application.mentorship_package_id)
    .maybeSingle();
  if (!packageData) return null;
  const recipient: Recipient = {
    userId: application.user_id,
    email: application.email,
    name: application.full_name || "Trader",
  };
  const approved = request.type === "mentorship_approved";
  return {
    type: request.type,
    resourceId: application.id,
    recipient,
    subject: approved
      ? "Your BlackPips mentorship application was approved"
      : "An update on your BlackPips mentorship application",
    react: approved ? (
      <MentorshipApprovedEmail
        studentName={recipient.name}
        packageName={packageData.name}
        whatsappUrl={WHATSAPP_URL}
      />
    ) : (
      <MentorshipRejectedEmail
        studentName={recipient.name}
        packageName={packageData.name}
        supportUrl={`mailto:${SUPPORT_EMAIL}`}
      />
    ),
  };
}

async function prepareCertificateEarned(
  request: NotificationRequest,
): Promise<PreparedNotification | null> {
  const { data: certificate, error } = await supabaseAdmin
    .from("course_certificates")
    .select("id,user_id,course_id,certificate_number")
    .eq("id", request.resourceId)
    .maybeSingle();
  if (
    error ||
    !certificate ||
    (certificate.user_id !== request.actorId && !(await isAdmin(request.actorId)))
  ) {
    if (error) console.error("[email] Unable to load certificate.");
    return null;
  }
  const [recipient, course] = await Promise.all([
    getRecipient(certificate.user_id),
    supabaseAdmin.from("courses").select("title").eq("id", certificate.course_id).maybeSingle(),
  ]);
  if (!recipient || !course.data) return null;
  return {
    type: "certificate_earned",
    resourceId: certificate.id,
    recipient,
    subject: `Certificate earned — ${course.data.title}`,
    react: (
      <CertificateEarnedEmail
        studentName={recipient.name}
        courseName={course.data.title}
        certificateNumber={certificate.certificate_number}
        certificateUrl={`${APP_URL}/certificates/${certificate.id}`}
      />
    ),
  };
}

async function getRecipient(userId: string): Promise<Recipient | null> {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data.user?.email) {
    if (error) console.error("[email] Unable to load recipient.");
    return null;
  }
  const metadata = data.user.user_metadata ?? {};
  const candidate = metadata.display_name ?? metadata.full_name;
  return {
    userId,
    email: data.user.email,
    name: typeof candidate === "string" && candidate.trim() ? candidate.trim() : data.user.email,
  };
}

async function isAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) console.error("[email] Unable to check administrator role.");
  return data?.role === "admin";
}

async function reserveDelivery(
  type: NotificationType,
  resourceId: string,
  recipientEmail: string,
): Promise<NotificationLog | null> {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("email_notifications")
    .select("id,status")
    .eq("event_type", type)
    .eq("resource_id", resourceId)
    .maybeSingle();
  if (existingError) {
    console.error("[email] Delivery-log lookup failed.");
    throw existingError;
  }
  if (existing?.status === "sent" || existing?.status === "processing") return null;

  const { data, error } = await supabaseAdmin
    .from("email_notifications")
    .upsert(
      {
        event_type: type,
        resource_id: resourceId,
        recipient_email: recipientEmail,
        status: "processing",
        error_message: null,
      },
      { onConflict: "event_type,resource_id" },
    )
    .select("id,status")
    .single();
  if (error) {
    console.error("[email] Delivery-log insert failed.");
    throw error;
  }
  return data;
}

async function updateDelivery(id: string, status: "sent" | "failed", errorMessage: string | null) {
  const { error } = await supabaseAdmin
    .from("email_notifications")
    .update({
      status,
      error_message: errorMessage,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) {
    console.error("[email] Unable to update delivery log.");
    throw error;
  }
}

type PreparedNotification = {
  type: NotificationType;
  resourceId: string;
  recipient: Recipient;
  subject: string;
  react: ReactElement;
};
