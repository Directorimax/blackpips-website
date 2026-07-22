import { BlackPipsEmailLayout, EmailBodyText } from "./components/BlackPipsEmailLayout";

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
      preview="Your mentorship application was approved"
      title="Mentorship approved"
      action={{ label: "Chat on WhatsApp", href: whatsappUrl }}
    >
      <EmailBodyText>
        Hi {studentName}, your application for <strong>{packageName}</strong> has been approved.
      </EmailBodyText>
      <EmailBodyText>
        Use the WhatsApp button below to receive your onboarding instructions from the BlackPips
        team.
      </EmailBodyText>
    </BlackPipsEmailLayout>
  );
}
