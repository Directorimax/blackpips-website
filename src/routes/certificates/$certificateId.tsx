import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Download, Loader2, MoveLeft, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";
import { supabase } from "@/integrations/supabase/client";
import { generateCertificatePng } from "@/lib/generateCertificateImage";
import type { CertificateImageData } from "@/lib/generateCertificateImage";

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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [renderFailed, setRenderFailed] = useState(false);

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

  // Same picture the app issues: the template image with the learner's details drawn on it.
  useEffect(() => {
    if (!certificate) return;
    let url: string | null = null;
    let cancelled = false;
    setRenderFailed(false);
    generateCertificatePng(toImageData(certificate))
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setImageUrl(url);
      })
      .catch((renderError) => {
        console.error("Certificate render failed:", renderError);
        if (!cancelled) setRenderFailed(true);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [certificate]);

  async function handleDownloadPng() {
    if (!certificate) return;
    try {
      setIsDownloading(true);
      const blob = await generateCertificatePng(toImageData(certificate));
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
      <div className="flex min-h-[calc(calc(100vh*var(--vhf,1))-8rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }
  if (!certificate || error) {
    return (
      <div className="mx-auto grid min-h-[calc(calc(100vh*var(--vhf,1))-8rem)] max-w-xl place-items-center px-4 py-16">
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
      <figure className="certificate-image">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${certificate.course_name} certificate for ${certificate.student_name}, number ${certificate.certificate_number}`}
            width={1200}
            height={800}
          />
        ) : renderFailed ? (
          <p className="small center">This certificate could not be drawn. Please try again.</p>
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        )}
      </figure>
    </main>
  );
}

function toImageData(certificate: Certificate): CertificateImageData {
  return {
    studentName: certificate.student_name,
    courseId: certificate.course_id,
    courseName: certificate.course_name,
    certificateNumber: certificate.certificate_number,
    issuedAt: certificate.issued_at,
    completionPercentage: certificate.completion_percentage,
  };
}
