import { BlackPipsEmailLayout, EmailBodyText } from "./components/BlackPipsEmailLayout";

export function PaymentApprovedEmail({
  studentName,
  courseName,
  amount,
  dashboardUrl,
}: {
  studentName: string;
  courseName: string;
  amount: string;
  dashboardUrl: string;
}) {
  return (
    <BlackPipsEmailLayout
      preview={`Your payment for ${courseName} was approved`}
      title="Payment approved"
      action={{ label: "Start learning", href: dashboardUrl }}
    >
      <EmailBodyText>
        Hi {studentName}, your payment for <strong>{courseName}</strong> has been approved.
      </EmailBodyText>
      <EmailBodyText>
        Amount received: <strong>{amount}</strong>
      </EmailBodyText>
    </BlackPipsEmailLayout>
  );
}
