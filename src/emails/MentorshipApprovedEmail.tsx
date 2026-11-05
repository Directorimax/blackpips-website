import {
  BlackPipsEmailLayout,
  EmailBodyText,
  EmailListItem,
} from "./components/BlackPipsEmailLayout";

export function MentorshipApprovedEmail({
  studentName,
  packageName,
  whatsappUrl,
}: {
  studentName: string;
  packageName: string;
  whatsappUrl: string;
}) {
  return (
    <BlackPipsEmailLayout
      preview="Your mentorship application is approved"
      title={`Welcome to mentorship, ${studentName}`}
      action={{ label: "Chat on WhatsApp", href: whatsappUrl }}
    >
      <EmailBodyText>
        Your application for <strong style={{ color: "#F8F5EE" }}>{packageName}</strong> has been{" "}
        <strong style={{ color: "#F8F5EE" }}>approved</strong>. Your mentor will guide your trading
        plan, journal reviews and live sessions.
      </EmailBodyText>
      <EmailListItem icon="1">Message us on WhatsApp for onboarding</EmailListItem>
      <EmailListItem icon="2">Complete your trader profile in the app</EmailListItem>
      <EmailListItem icon="3">Join your first session</EmailListItem>
      <div style={{ height: "18px" }} />
    </BlackPipsEmailLayout>
  );
}
