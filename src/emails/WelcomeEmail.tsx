import { BlackPipsEmailLayout, EmailBodyText } from "./components/BlackPipsEmailLayout";

export function WelcomeEmail({
  studentName,
  dashboardUrl,
}: {
  studentName: string;
  dashboardUrl: string;
}) {
  return (
    <BlackPipsEmailLayout
      preview="Welcome to BlackPips"
      title={`Welcome, ${studentName}`}
      action={{ label: "Open your dashboard", href: dashboardUrl }}
    >
      <EmailBodyText>
        Your BlackPips learning journey starts here. Explore premium lessons, track your progress,
        and build your trading framework with confidence.
      </EmailBodyText>
      <EmailBodyText>We’re glad to have you with us.</EmailBodyText>
    </BlackPipsEmailLayout>
  );
}
