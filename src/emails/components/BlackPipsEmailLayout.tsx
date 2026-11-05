import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
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
      <Head>
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
        {/* Gmail's app inverts colours in dark mode; these wrappers undo it. */}
        <style>{`u + .body .gmail-screen { background:#000; mix-blend-mode:screen; }
u + .body .gmail-difference { background:#000; mix-blend-mode:difference; }`}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body className="body" style={body}>
        <Container style={container}>
          <Section style={brandSection}>
            <Img src={LOGO_URL} width="139" height="24" alt="BLACKPIPS" style={brand} />
          </Section>
          <Section style={content}>
            <GmailKeepColours>
              <Heading style={heading}>{title}</Heading>
              {children}
            </GmailKeepColours>
            {/* Outside the Gmail fix: it only keeps white and grey, and would turn gold blue. */}
            {action ? (
              <Button href={action.href} style={button}>
                {action.label}
              </Button>
            ) : null}
          </Section>
          <Section style={footer}>
            <GmailKeepColours>
              <Text style={footerText}>
                Need help? Contact{" "}
                <a href={`mailto:${supportEmail}`} style={footerLink}>
                  {supportEmail}
                </a>
                .
              </Text>
              <Text style={footerText}>© {new Date().getFullYear()} BLACKPIPS · blackpips.com</Text>
            </GmailKeepColours>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const LOGO_URL =
  "https://supabase.blackpips.com/storage/v1/object/public/email-assets/blackpips-wordmark.png";

/** Content inside keeps its real colours in the Gmail app's dark mode. */
function GmailKeepColours({ children }: { children: ReactNode }) {
  return (
    <div className="gmail-screen">
      <div className="gmail-difference">{children}</div>
    </div>
  );
}

export function EmailBodyText({ children }: { children: ReactNode }) {
  return <Text style={emailText}>{children}</Text>;
}

/** Icon list row, e.g. "▶ Watch at your own pace". */
export function EmailListItem({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={listRow}>
      <tbody>
        <tr>
          <td style={listIcon}>{icon}</td>
          <td style={listText}>{children}</td>
        </tr>
      </tbody>
    </table>
  );
}

/** Small grey box for receipts and safety notes. */
export function EmailNote({ children }: { children: ReactNode }) {
  return <Text style={note}>{children}</Text>;
}

const emailText = {
  color: "#A9A396",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 18px",
} as const;
const listRow = { borderBottom: "1px solid #181b21", margin: "0" } as const;
const listIcon = {
  backgroundColor: "#1A1C21",
  borderRadius: "8px",
  color: "#F8F5EE",
  fontSize: "13px",
  height: "28px",
  textAlign: "center" as const,
  width: "28px",
};
const listText = {
  color: "#D8D2C4",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: "14px",
  padding: "9px 0 9px 12px",
} as const;
const note = {
  backgroundColor: "#101317",
  border: "1px solid #1d2026",
  borderRadius: "12px",
  color: "#8f8a80",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: "13px",
  lineHeight: "1.5",
  margin: "18px 0 0",
  padding: "12px 14px",
} as const;
const body = {
  backgroundColor: "#000000",
  backgroundImage: "linear-gradient(#000000, #000000)",
  color: "#EDE8DC",
  margin: "0",
  padding: "28px 14px",
} as const;
const container = {
  backgroundColor: "#0B0D11",
  backgroundImage: "linear-gradient(#0B0D11, #0B0D11)",
  borderRadius: "18px",
  margin: "0 auto",
  maxWidth: "560px",
  overflow: "hidden",
} as const;
const brandSection = {
  backgroundColor: "#07090D",
  backgroundImage:
    "radial-gradient(circle at 85% -10%, rgba(240,187,59,.28), rgba(240,187,59,0) 55%), linear-gradient(#07090D, #07090D)",
  padding: "22px 28px 18px",
};
const brand = { border: "0", display: "block", height: "24px", width: "139px" } as const;
const content = { padding: "28px" } as const;
const heading = {
  color: "#F8F5EE",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: "22px",
  fontWeight: "700",
  lineHeight: "1.3",
  margin: "0 0 10px",
} as const;
const button = {
  backgroundColor: "#D9971F",
  backgroundImage: "linear-gradient(135deg, #ECB23A, #B97500)",
  borderRadius: "999px",
  color: "#FFFFFF",
  display: "inline-block",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: "15px",
  fontWeight: "700",
  margin: "8px 0 4px",
  padding: "14px 26px",
  textDecoration: "none",
} as const;
const footer = { padding: "16px 28px" } as const;
const footerText = {
  color: "#6f6a60",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: "12px",
  lineHeight: "1.5",
  margin: "0 0 4px",
};
const footerLink = { color: "#D8D2C4", textDecoration: "underline" } as const;
