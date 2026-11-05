import {
  BlackPipsEmailLayout,
  EmailBodyText,
  EmailListItem,
} from "./components/BlackPipsEmailLayout";

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
      preview={`${courseName} is unlocked`}
      title="Your course is unlocked"
      action={{ label: "Start learning", href: dashboardUrl }}
    >
      <EmailBodyText>
        Hi {studentName}, payment received. <strong style={{ color: "#F8F5EE" }}>{courseName}</strong>{" "}
        is now open in your BLACKPIPS app.
      </EmailBodyText>
      <EmailListItem icon="▶">Lifetime access to every lesson</EmailListItem>
      <EmailListItem icon="⏱">Watch at your own pace, on any device</EmailListItem>
      <EmailListItem icon="★">Certificate when you complete it</EmailListItem>
      <div style={{ height: "18px" }} />
    </BlackPipsEmailLayout>
  );
}
