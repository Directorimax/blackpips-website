import { BlackPipsEmailLayout, EmailBodyText } from "./components/BlackPipsEmailLayout";

export function AdminMentorshipSubmittedEmail({
  learnerName,
  learnerEmail,
  whatsapp,
  packageName,
  reviewUrl,
}: {
  learnerName: string;
  learnerEmail: string;
  whatsapp: string;
  packageName: string;
  reviewUrl: string;
}) {
  return (
    <BlackPipsEmailLayout
      preview="New mentorship application"
      title="New mentorship application"
      action={{ label: "Review application", href: reviewUrl }}
    >
      <EmailBodyText>
        <strong>{learnerName}</strong> ({learnerEmail}) applied for <strong>{packageName}</strong>.
      </EmailBodyText>
      <EmailBodyText>
        WhatsApp: <strong>{whatsapp}</strong>
        <br />
        Payment proof: not required at application stage.
        <br />
        ID upload: not required at application stage.
      </EmailBodyText>
    </BlackPipsEmailLayout>
  );
}
