import { Resend } from "resend";
import type { ReactElement } from "react";
import { WelcomeEmail } from "@/emails/WelcomeEmail";
import { PaymentApprovedEmail } from "@/emails/PaymentApprovedEmail";
import { CourseUnlockedEmail } from "@/emails/CourseUnlockedEmail";
import { MentorshipApprovedEmail } from "@/emails/MentorshipApprovedEmail";
import { MentorshipRejectedEmail } from "@/emails/MentorshipRejectedEmail";
import { CertificateEarnedEmail } from "@/emails/CertificateEarnedEmail";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { formatTZS } from "@/lib/site-data";

type NotificationType =
  | "welcome"
  | "payment_approved"
  | "course_unlocked"
  | "mentorship_approved"
  | "mentorship_rejected"
  | "certificate_earned";

type NotificationRequest = { type: NotificationType; resourceId: string; actorId: string };
type Recipient = { userId: string; email: string; name: string };
type NotificationLog = { id: string; status: string };

const APP_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const SUPPORT_EMAIL = process.env.BLACKPIPS_SUPPORT_EMAIL ?? "support@blackpips.com";
const WHATSAPP_URL = "https://wa.me/255693413655";

export async function sendNotification(
  request: NotificationRequest,
): Promise<{ delivered: boolean }> {
  try {
    console.info("[email] Preparing notification", {
      type: request.type,
      resourceId: request.resourceId,
    });
    const prepared = await prepareNotification(request);
    if (!prepared) {
      console.warn("[email] No email was prepared for notification request", {
        type: request.type,
        resourceId: request.resourceId,
      });
      return { delivered: false };
    }

    console.info("[email] Email template selected", {
      type: prepared.type,
      resourceId: prepared.resourceId,
    });

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    console.info("[email] Runtime email configuration", {
      hasResendApiKey: Boolean(apiKey),
      hasResendFromEmail: Boolean(from),
      hasAppUrl: Boolean(process.env.APP_URL),
      hasSupportEmail: Boolean(process.env.BLACKPIPS_SUPPORT_EMAIL),
    });
    if (!apiKey || !from) {
      console.warn(
        "[email] Skipping notification because RESEND_API_KEY or RESEND_FROM_EMAIL is missing.",
      );
      return { delivered: false };
    }

    const log = await reserveDelivery(prepared.type, prepared.resourceId, prepared.recipient.email);
    if (!log) {
      console.info("[email] Delivery skipped because this event is already reserved or sent", {
        type: prepared.type,
        resourceId: prepared.resourceId,
      });
      return { delivered: false };
    }

    try {
      const resend = new Resend(apiKey);
      console.info("[email] Resend client initialized", { type: prepared.type });
      console.info("[email] Resend request started", {
        type: prepared.type,
        resourceId: prepared.resourceId,
        subject: prepared.subject,
      });
      const result = await resend.emails.send({
        from,
        to: [prepared.recipient.email],
        subject: prepared.subject,
        react: prepared.react,
      });
      console.info("[email] Resend response", {
        type: prepared.type,
        id: result.data?.id ?? null,
        error: result.error?.message ?? null,
      });
      if (result.error) throw new Error(result.error.message);
      await updateDelivery(log.id, "sent", null);
      return { delivered: true };
    } catch (error) {
      console.error("[email] Resend request threw an error", error);
      await updateDelivery(
        log.id,
        "failed",
        error instanceof Error ? error.message : "Unknown provider error",
      );
      throw error;
    }
  } catch (error) {
    // Notifications are deliberately non-blocking: business actions have already succeeded.
    console.error("[email] Notification delivery failed:", error);
    return { delivered: false };
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
  }
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
    if (error) console.error("[email] Unable to load approved payment:", error);
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
    if (error) console.error("[email] Unable to load mentorship application:", error);
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
    if (error) console.error("[email] Unable to load certificate:", error);
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
    if (error) console.error("[email] Unable to load recipient:", error);
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
  if (error) console.error("[email] Unable to check administrator role:", error);
  return data?.role === "admin";
}

async function reserveDelivery(
  type: NotificationType,
  resourceId: string,
  recipientEmail: string,
): Promise<NotificationLog | null> {
  console.info("[email] Checking notification delivery log", { type, resourceId });
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("email_notifications")
    .select("id,status")
    .eq("event_type", type)
    .eq("resource_id", resourceId)
    .maybeSingle();
  if (existingError) {
    console.error("[email] Delivery-log lookup failed", { type, resourceId, error: existingError });
    throw existingError;
  }
  if (existing?.status === "sent" || existing?.status === "processing") {
    if (type === "welcome") {
      console.info("[email] Welcome notification skipped", {
        userId: resourceId,
        existingStatus: existing.status,
        isNewForWelcomeDelivery: false,
      });
    }
    return null;
  }

  if (type === "welcome") {
    console.info("[email] Welcome notification requested", {
      userId: resourceId,
      isNewForWelcomeDelivery: !existing,
      retryingFailedDelivery: existing?.status === "failed",
    });
  }

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
    console.error("[email] Delivery-log insert failed", { type, resourceId, error });
    throw error;
  }
  console.info("[email] Delivery-log row created", { type, resourceId, notificationId: data.id });
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
  if (error) console.error("[email] Unable to update delivery log:", error);
}

type PreparedNotification = {
  type: NotificationType;
  resourceId: string;
  recipient: Recipient;
  subject: string;
  react: ReactElement;
};
