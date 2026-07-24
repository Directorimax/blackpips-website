import { BlackPipsEmailLayout, EmailBodyText } from "./components/BlackPipsEmailLayout";

export function PaymentRejectedEmail({
  studentName,
  courseName,
  reason,
  dashboardUrl,
}: {
  studentName: string;
  courseName: string;
  reason: string | null;
  dashboardUrl: string;
}) {
  return (
    <BlackPipsEmailLayout
      preview="An update on your course request"
      title="Course request update"
      action={{ label: "Open dashboard", href: dashboardUrl }}
    >
      <EmailBodyText>
        Hi {studentName}, we could not approve your payment request for{" "}
        <strong>{courseName}</strong>.
      </EmailBodyText>
      <EmailBodyText>
        {reason ? (
          <>
            Reason: <strong>{reason}</strong>
          </>
        ) : (
          "Please contact support if you need more information."
        )}
      </EmailBodyText>
    </BlackPipsEmailLayout>
  );
}
