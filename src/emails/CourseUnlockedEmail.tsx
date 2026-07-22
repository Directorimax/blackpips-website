import { BlackPipsEmailLayout, EmailBodyText } from "./components/BlackPipsEmailLayout";

export function CourseUnlockedEmail({
  studentName,
  courseName,
  dashboardUrl,
}: {
  studentName: string;
  courseName: string;
  dashboardUrl: string;
}) {
  return (
    <BlackPipsEmailLayout
      preview={`${courseName} is now unlocked`}
      title="Your course is unlocked"
      action={{ label: "Open dashboard", href: dashboardUrl }}
    >
      <EmailBodyText>
        Hi {studentName}, you now have lifetime access to <strong>{courseName}</strong>.
      </EmailBodyText>
      <EmailBodyText>Your course is ready whenever you are.</EmailBodyText>
    </BlackPipsEmailLayout>
  );
}
