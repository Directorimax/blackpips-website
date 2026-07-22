import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

type BlackPipsEmailLayoutProps = {
  preview: string;
  title: string;
  children: ReactNode;
  action?: { label: string; href: string };
};

export function BlackPipsEmailLayout({
  preview,
  title,
  children,
  action,
}: BlackPipsEmailLayoutProps) {
  const supportEmail = process.env.BLACKPIPS_SUPPORT_EMAIL ?? "support@blackpips.com";

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={brandSection}>
            <Text style={brand}>BLACKPIPS</Text>
            <Text style={brandRule}>ACADEMY</Text>
          </Section>
          <Section style={content}>
            <Heading style={heading}>{title}</Heading>
            {children}
            {action ? (
              <Button href={action.href} style={button}>
                {action.label}
              </Button>
            ) : null}
          </Section>
          <Section style={footer}>
            <Text style={footerText}>
              Need help? Contact{" "}
              <a href={`mailto:${supportEmail}`} style={footerLink}>
                {supportEmail}
              </a>
              .
            </Text>
            <Text style={footerText}>
              © {new Date().getFullYear()} BlackPips Academy. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function EmailBodyText({ children }: { children: ReactNode }) {
  return <Text style={emailText}>{children}</Text>;
}

const emailText = {
  color: "#f7f1df",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: "16px",
  lineHeight: "1.65",
  margin: "0 0 18px",
} as const;
const body = {
  backgroundColor: "#090909",
  color: "#f7f1df",
  margin: "0",
  padding: "32px 12px",
} as const;
const container = {
  backgroundColor: "#111111",
  border: "1px solid #c9a44c",
  borderRadius: "18px",
  margin: "0 auto",
  maxWidth: "600px",
  overflow: "hidden",
} as const;
const brandSection = {
  backgroundColor: "#090909",
  borderBottom: "1px solid #5e4a20",
  padding: "28px 40px 24px",
  textAlign: "center" as const,
};
const brand = {
  color: "#e3c675",
  fontFamily: "Georgia, serif",
  fontSize: "28px",
  fontWeight: "700",
  letterSpacing: "3px",
  margin: "0",
} as const;
const brandRule = {
  color: "#a89d80",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: "10px",
  fontWeight: "700",
  letterSpacing: "4px",
  margin: "7px 0 0",
} as const;
const content = { padding: "38px 40px 32px" } as const;
const heading = {
  color: "#f7f1df",
  fontFamily: "Georgia, serif",
  fontSize: "30px",
  fontWeight: "700",
  lineHeight: "1.25",
  margin: "0 0 22px",
} as const;
const button = {
  backgroundColor: "#c9a44c",
  borderRadius: "999px",
  color: "#090909",
  display: "inline-block",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: "14px",
  fontWeight: "700",
  margin: "8px 0 4px",
  padding: "14px 22px",
  textDecoration: "none",
} as const;
const footer = { borderTop: "1px solid #2d2a21", padding: "22px 40px 28px" } as const;
const footerText = {
  color: "#a89d80",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: "12px",
  lineHeight: "1.55",
  margin: "0 0 6px",
  textAlign: "center" as const,
};
const footerLink = { color: "#e3c675", textDecoration: "underline" } as const;
