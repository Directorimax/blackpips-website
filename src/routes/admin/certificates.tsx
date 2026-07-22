import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Award, ExternalLink, Loader2, Search, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";
import { useAdmin } from "@/hooks/useAdmin";

export const Route = createFileRoute("/admin/certificates")({
  head: () => ({
    meta: [{ title: "Certificates — BlackPips Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <AuthenticatedRouteGuard>
      <AdminCertificates />
    </AuthenticatedRouteGuard>
  ),
});

type Certificate = {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  course_id: string;
  course_name: string;
  certificate_number: string;
  issued_at: string;
};

function AdminCertificates() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [search, setSearch] = useState("");
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCertificates = useCallback(
    async (query = search) => {
      setLoading(true);
      setError(null);
      const { data, error: rpcError } = await supabase.rpc("admin_list_course_certificates", {
        p_search: query.trim() || null,
      });
      if (rpcError) {
        console.error("Could not load certificates:", rpcError);
        setError("We could not load course certificates. Please try again.");
      } else {
        setCertificates(data ?? []);
      }
      setLoading(false);
    },
    [search],
  );

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [adminLoading, isAdmin, navigate]);
  useEffect(() => {
    if (isAdmin) void loadCertificates("");
  }, [isAdmin, loadCertificates]);

  if (adminLoading || !isAdmin) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold">
            <ShieldCheck className="h-4 w-4" /> Administration
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold">Course certificates</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Review automatically issued learner certificates.
          </p>
        </div>
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">Search certificates</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void loadCertificates()}
            placeholder="Learner, course or certificate number"
            className="admin-input admin-search-input w-full"
          />
        </label>
      </header>
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => void loadCertificates()}
          className="rounded-full border border-gold/40 px-4 py-2 text-xs font-semibold text-gold"
        >
          Search
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        </div>
      ) : error ? (
        <div className="glass mt-6 rounded-3xl p-10 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => void loadCertificates()}
            className="mt-4 rounded-full bg-gradient-gold px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            Try again
          </button>
        </div>
      ) : certificates.length === 0 ? (
        <div className="glass mt-6 rounded-3xl p-10 text-center">
          <Award className="mx-auto h-8 w-8 text-gold" />
          <h2 className="mt-4 font-display text-lg font-semibold">No certificates found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Issued certificates will appear here as learners complete courses.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-3xl border border-border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-secondary/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-4">Learner</th>
                <th className="px-4 py-4">Course</th>
                <th className="px-4 py-4">Certificate no.</th>
                <th className="px-4 py-4">Issued</th>
                <th className="px-4 py-4" aria-label="View certificate" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {certificates.map((certificate) => (
                <tr key={certificate.id} className="transition hover:bg-secondary/30">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{certificate.display_name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{certificate.email}</p>
                  </td>
                  <td className="px-4 py-4 font-medium">{certificate.course_name}</td>
                  <td className="px-4 py-4 font-mono text-xs text-gold">
                    {certificate.certificate_number}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {new Date(certificate.issued_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      to="/certificates/$certificateId"
                      params={{ certificateId: certificate.id }}
                      className="admin-icon"
                      aria-label={`View ${certificate.certificate_number}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
