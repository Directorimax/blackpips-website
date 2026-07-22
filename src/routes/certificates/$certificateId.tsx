import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Download, Loader2, MoveLeft, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import certificateLogo from "@/assets/blackpips-bull-gold.png";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";
import { supabase } from "@/integrations/supabase/client";
import { generateCertificatePng } from "@/lib/generateCertificateImage";

export const Route = createFileRoute("/certificates/$certificateId")({
  head: () => ({
    meta: [{ title: "Course Certificate — BlackPips" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <AuthenticatedRouteGuard>
      <CertificatePage />
    </AuthenticatedRouteGuard>
  ),
});

type Certificate = {
  id: string;
  course_id: string;
  course_name: string;
  student_name: string;
  certificate_number: string;
  issued_at: string;
  completion_percentage: number;
};

function CertificatePage() {
  const { certificateId } = Route.useParams();
  const navigate = useNavigate();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const loadCertificate = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("get_course_certificate", {
      p_certificate_id: certificateId,
    });
    if (rpcError) {
      console.error("Could not load certificate:", rpcError);
      setError("This certificate is unavailable or you do not have access to it.");
    } else {
      setCertificate(data as Certificate);
    }
    setLoading(false);
  }, [certificateId]);

  useEffect(() => {
    void loadCertificate();
  }, [loadCertificate]);

  async function handleDownloadPng() {
    if (!certificate) return;
    try {
      setIsDownloading(true);
      const blob = await generateCertificatePng({
        studentName: certificate.student_name,
        courseName: certificate.course_name,
        certificateNumber: certificate.certificate_number,
        issuedAt: certificate.issued_at,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `BlackPips-${certificate.certificate_number}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      toast.success("Certificate download started.");
    } catch (downloadError) {
      console.error("Certificate PNG generation failed:", downloadError);
      toast.error("We could not generate your certificate. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }
  if (!certificate || error) {
    return (
      <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-xl place-items-center px-4 py-16">
        <div className="glass rounded-3xl p-8 text-center shadow-elegant">
          <ShieldCheck className="mx-auto h-8 w-8 text-gold" />
          <h1 className="mt-4 font-display text-2xl font-bold">Certificate unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => void loadCertificate()}
            className="mt-5 rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const completionDate = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(certificate.issued_at));
  return (
    <main className="certificate-page mx-auto max-w-6xl px-4 py-14 sm:py-16">
      <div className="certificate-controls mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:text-gold"
        >
          <MoveLeft className="h-4 w-4" /> Back to dashboard
        </button>
        <button
          onClick={() => void handleDownloadPng()}
          disabled={isDownloading}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:cursor-wait disabled:opacity-70"
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {isDownloading ? "Generating certificate..." : "Download Certificate PNG"}
        </button>
      </div>
      <article className="certificate-sheet">
        <div className="certificate-inner-border" />
        <div className="certificate-glow" />
        <div className="certificate-content">
          <div className="certificate-brand">
            <img
              src={certificateLogo}
              alt="BlackPips logo"
              width={48}
              height={48}
              className="certificate-logo"
            />
            <span>
              Black<span>Pips</span>
            </span>
          </div>
          <p className="certificate-eyebrow">Certificate of completion</p>
          <h1 className="certificate-heading">This certifies that</h1>
          <p className="certificate-student-name">{certificate.student_name}</p>
          <p className="certificate-description">
            has successfully completed every published lesson in the BlackPips premium course
          </p>
          <h2 className="certificate-course-name">{certificate.course_name}</h2>
          <div className="certificate-meta-grid">
            <CertificateMeta label="Completion date" value={completionDate} />
            <CertificateMeta label="Completion" value={`${certificate.completion_percentage}%`} />
            <CertificateMeta label="Certificate no." value={certificate.certificate_number} />
          </div>
          <div className="certificate-signatures">
            <Signature label="BlackPips Academy" caption="Instructor signature" />
            <div className="certificate-seal">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <Signature label="BlackPips" caption="Verified completion" />
          </div>
        </div>
      </article>
    </main>
  );
}

function CertificateMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="certificate-meta-item">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}
function Signature({ label, caption }: { label: string; caption: string }) {
  return (
    <div className="certificate-signature">
      <p>{label}</p>
      <span>{caption}</span>
    </div>
  );
}
