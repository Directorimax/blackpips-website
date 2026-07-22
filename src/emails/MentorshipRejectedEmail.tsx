import { BlackPipsEmailLayout, EmailBodyText } from "./components/BlackPipsEmailLayout";

export function MentorshipRejectedEmail({
  studentName,
  packageName,
  supportUrl,
}: {
  studentName: string;
  packageName: string;
  supportUrl: string;
}) {
  return (
    <BlackPipsEmailLayout
      preview="An update on your mentorship application"
      title="Mentorship application update"
      action={{ label: "Contact support", href: supportUrl }}
    >
      <EmailBodyText>
        Hi {studentName}, thank you for applying for <strong>{packageName}</strong>.
      </EmailBodyText>
      <EmailBodyText>
        We’re unable to move forward with this application at this time. If you have questions or
        would like guidance on the next step, our support team is here to help.
      </EmailBodyText>
    </BlackPipsEmailLayout>
  );
}
