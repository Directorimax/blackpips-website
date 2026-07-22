import { BlackPipsEmailLayout, EmailBodyText } from "./components/BlackPipsEmailLayout";

export function CertificateEarnedEmail({
  studentName,
  courseName,
  certificateNumber,
  certificateUrl,
}: {
  studentName: string;
  courseName: string;
  certificateNumber: string;
  certificateUrl: string;
}) {
  return (
    <BlackPipsEmailLayout
      preview={`You earned a certificate for ${courseName}`}
      title="Certificate earned"
      action={{ label: "View certificate", href: certificateUrl }}
    >
      <EmailBodyText>
        Congratulations, {studentName}. You completed <strong>{courseName}</strong> and earned your
        BlackPips certificate.
      </EmailBodyText>
      <EmailBodyText>
        Certificate number: <strong>{certificateNumber}</strong>
      </EmailBodyText>
    </BlackPipsEmailLayout>
  );
}
