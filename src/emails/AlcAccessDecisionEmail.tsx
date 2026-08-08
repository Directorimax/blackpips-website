import { BlackPipsEmailLayout, EmailBodyText } from "./components/BlackPipsEmailLayout";

export function AlcAccessDecisionEmail({
  studentName,
  approved,
  publicMessage,
  accessUrl,
}: {
  studentName: string;
  approved: boolean;
  publicMessage: string | null;
  accessUrl: string;
}) {
  return (
    <BlackPipsEmailLayout
      preview={
        approved ? "Your ALC Access request was approved" : "An update on your ALC Access request"
      }
      title={approved ? "ALC Access approved" : "ALC Access request update"}
      action={{
        label: approved ? "Open ALC video library" : "View request status",
        href: accessUrl,
      }}
    >
      <EmailBodyText>Hi {studentName},</EmailBodyText>
      {approved ? (
        <>
          <EmailBodyText>
            Your ALC Access request has been approved. Sign in to BlackPips to access the ALC
            student video library.
          </EmailBodyText>
          <EmailBodyText>Your access is linked to your BlackPips account.</EmailBodyText>
        </>
      ) : (
        <>
          <EmailBodyText>
            We could not verify your ALC Access request at this time. You can sign in to review its
            current status or contact BlackPips if you believe this is a mistake.
          </EmailBodyText>
          {publicMessage ? <EmailBodyText>Review message: {publicMessage}</EmailBodyText> : null}
        </>
      )}
    </BlackPipsEmailLayout>
  );
}
