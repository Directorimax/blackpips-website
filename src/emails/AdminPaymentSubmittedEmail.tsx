import { BlackPipsEmailLayout, EmailBodyText } from "./components/BlackPipsEmailLayout";

export function AdminPaymentSubmittedEmail({
  learnerName,
  learnerEmail,
  courseName,
  amount,
  reference,
  reviewUrl,
}: {
  learnerName: string;
  learnerEmail: string;
  courseName: string;
  amount: string;
  reference: string;
  reviewUrl: string;
}) {
  return (
    <BlackPipsEmailLayout
      preview="New course access request"
      title="New course access request"
      action={{ label: "Review payment", href: reviewUrl }}
    >
      <EmailBodyText>
        <strong>{learnerName}</strong> ({learnerEmail}) submitted payment proof for{" "}
        <strong>{courseName}</strong>.
      </EmailBodyText>
      <EmailBodyText>
        Amount: <strong>{amount}</strong>
        <br />
        Reference: <strong>{reference}</strong>
        <br />
        Payment proof: uploaded and awaiting review.
      </EmailBodyText>
    </BlackPipsEmailLayout>
  );
}
