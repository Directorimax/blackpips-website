import { ImageOff, LoaderCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { ALC_PROOF_BUCKET, isSignedProofFresh, proofAttachmentLabel } from "@/lib/alc-proof-viewer";

type Proof = {
  proof_id: string;
  request_id: string;
  user_id: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
};

type SignedProof = {
  url?: string;
  expiresAt?: number;
  loading?: boolean;
  error?: string;
};

export function AlcVerificationProofs({ requestId }: { requestId: string }) {
  const mounted = useRef(true);
  const [proofs, setProofs] = useState<Proof[] | null>(null);
  const [listError, setListError] = useState("");
  const [signedProofs, setSignedProofs] = useState<Record<string, SignedProof>>({});
  const [activeProofId, setActiveProofId] = useState<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const signProof = useCallback(async (proof: Proof) => {
    setSignedProofs((current) => ({
      ...current,
      [proof.proof_id]: { ...current[proof.proof_id], loading: true, error: undefined },
    }));
    try {
      const { data: descriptorRows, error: descriptorError } = await supabase.rpc(
        "admin_get_alc_request_proof_signed_url_descriptor",
        { p_proof_id: proof.proof_id },
      );
      if (descriptorError) throw descriptorError;
      const descriptor = descriptorRows?.[0];
      if (!descriptor || descriptor.bucket_id !== ALC_PROOF_BUCKET) {
        throw new Error("The proof descriptor was unavailable.");
      }
      const { data, error } = await supabase.storage
        .from(ALC_PROOF_BUCKET)
        .createSignedUrl(descriptor.storage_path, descriptor.signed_url_ttl_seconds);
      if (error) throw error;
      if (!data?.signedUrl) throw new Error("The secure proof preview was unavailable.");
      if (!mounted.current) return;
      setSignedProofs((current) => ({
        ...current,
        [proof.proof_id]: {
          url: data.signedUrl,
          expiresAt: Date.now() + descriptor.signed_url_ttl_seconds * 1000,
          loading: false,
        },
      }));
    } catch (error) {
      if (!mounted.current) return;
      console.error("[admin-alc-proof] secure preview failed", error);
      setSignedProofs((current) => ({
        ...current,
        [proof.proof_id]: {
          loading: false,
          error: "Secure preview unavailable.",
        },
      }));
    }
  }, []);

  const loadProofs = useCallback(async () => {
    setListError("");
    setProofs(null);
    const { data, error } = await supabase.rpc("admin_list_alc_access_request_proofs", {
      p_request_id: requestId,
    });
    if (!mounted.current) return;
    if (error) {
      console.error("[admin-alc-proof] metadata load failed", error);
      setListError("Verification proofs could not be loaded.");
      setProofs([]);
      return;
    }
    const nextProofs = data ?? [];
    setProofs(nextProofs);
    await Promise.allSettled(nextProofs.map((proof) => signProof(proof)));
  }, [requestId, signProof]);

  useEffect(() => {
    void loadProofs();
  }, [loadProofs]);

  async function openProof(proof: Proof) {
    const signed = signedProofs[proof.proof_id];
    if (!signed?.url || !isSignedProofFresh(signed.expiresAt)) {
      await signProof(proof);
    }
    if (mounted.current) setActiveProofId(proof.proof_id);
  }

  function markBroken(proofId: string) {
    setSignedProofs((current) => ({
      ...current,
      [proofId]: { error: "Secure preview expired or failed to load.", loading: false },
    }));
  }

  const activeIndex = proofs?.findIndex((proof) => proof.proof_id === activeProofId) ?? -1;
  const activeProof = activeIndex >= 0 ? proofs?.[activeIndex] : null;
  const activeSigned = activeProof ? signedProofs[activeProof.proof_id] : null;

  return (
    <section className="mt-3 rounded-xl border border-border/70 bg-background/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Verification proof
        </h3>
        {proofs && proofs.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {proofAttachmentLabel(proofs.length)}
          </span>
        )}
      </div>

      {proofs === null && !listError && (
        <p className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Loading proofs…
        </p>
      )}
      {listError && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-destructive">
          <span>{listError}</span>
          <RetryButton onClick={() => void loadProofs()} />
        </div>
      )}
      {proofs?.length === 0 && !listError && (
        <p className="mt-2 text-xs text-muted-foreground">No proof attached</p>
      )}
      {proofs && proofs.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {proofs.map((proof, index) => {
            const signed = signedProofs[proof.proof_id];
            return (
              <div key={proof.proof_id} className="min-w-0">
                {signed?.url ? (
                  <button
                    type="button"
                    className="block aspect-square w-full overflow-hidden rounded-xl border border-border bg-muted focus:outline-none focus:ring-2 focus:ring-gold"
                    onClick={() => void openProof(proof)}
                    aria-label={`Open verification proof ${index + 1}`}
                  >
                    <img
                      src={signed.url}
                      alt={`Verification proof ${index + 1}`}
                      className="h-full w-full object-cover"
                      onError={() => markBroken(proof.proof_id)}
                    />
                  </button>
                ) : (
                  <div className="grid aspect-square place-items-center rounded-xl border border-border bg-muted/50 p-2 text-center">
                    {signed?.loading ? (
                      <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <div>
                        <ImageOff className="mx-auto h-5 w-5 text-muted-foreground" />
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {signed?.error || "Preview unavailable"}
                        </p>
                        <RetryButton onClick={() => void signProof(proof)} />
                      </div>
                    )}
                  </div>
                )}
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  Attachment {index + 1}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(activeProof)} onOpenChange={(open) => !open && setActiveProofId(null)}>
        <DialogContent className="max-h-[90dvh] max-w-4xl overflow-auto rounded-2xl border-gold/20 bg-card">
          <DialogHeader>
            <DialogTitle>Verification proof</DialogTitle>
            <DialogDescription>
              {activeIndex >= 0 ? `Attachment ${activeIndex + 1} of ${proofs?.length ?? 0}` : ""}
            </DialogDescription>
          </DialogHeader>
          {activeProof && activeSigned?.url ? (
            <img
              src={activeSigned.url}
              alt={`Verification proof ${activeIndex + 1}`}
              className="max-h-[72dvh] w-full rounded-xl object-contain"
              onError={() => markBroken(activeProof.proof_id)}
            />
          ) : activeProof ? (
            <div className="grid min-h-56 place-items-center rounded-xl border border-border bg-muted/40 text-center">
              <div>
                <ImageOff className="mx-auto h-7 w-7 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Secure preview unavailable.</p>
                <RetryButton onClick={() => void signProof(activeProof)} />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] font-semibold text-foreground"
    >
      <RefreshCw className="h-3 w-3" /> Retry
    </button>
  );
}
