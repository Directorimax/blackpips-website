import { Link } from "@tanstack/react-router";
import { FileText, Gift, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { WELCOME_GIFT } from "@/lib/welcome-gift";
import {
  claimWelcomeGift,
  getWelcomeGiftStatus,
} from "@/services/welcome-gift/welcome-gift.functions";

const dismissalKey = `blackpips-gift-dismissed:${WELCOME_GIFT.id}`;

export function WelcomeGiftPanel() {
  const [loading, setLoading] = useState(true);
  const [statusError, setStatusError] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const loadStatus = useCallback(() => {
    let active = true;
    setLoading(true);
    setStatusError(false);
    void getWelcomeGiftStatus()
      .then((status) => {
        if (!active) return;
        setClaimed(status.claimed);
        if (!status.claimed && sessionStorage.getItem(dismissalKey) !== "1") setModalOpen(true);
      })
      .catch(() => {
        if (active) setStatusError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return loadStatus();
  }, [loadStatus]);

  const handleModalChange = useCallback((open: boolean) => {
    setModalOpen(open);
    if (!open) sessionStorage.setItem(dismissalKey, "1");
  }, []);

  async function handleClaim() {
    if (claiming) return;
    setClaiming(true);
    try {
      await claimWelcomeGift();
      setClaimed(true);
      setUnlocked(true);
      setModalOpen(false);
      sessionStorage.removeItem(dismissalKey);
      window.setTimeout(() => setUnlocked(false), 900);
      toast.success("Gift unlocked. Welcome to BLACKPIPS!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not unlock your gift.");
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return (
      <div
        className="mt-8 h-28 animate-pulse rounded-3xl border border-border bg-muted/45"
        aria-label="Loading Welcome Gift"
      />
    );
  }

  if (statusError) {
    return (
      <div className="mt-8 flex min-h-28 items-center justify-between gap-4 rounded-3xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">We could not load your Welcome Gift.</p>
        <button
          type="button"
          onClick={loadStatus}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-gold/35 px-4 text-xs font-bold text-gold hover:bg-gold/10"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" /> Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {claimed ? (
        <section
          aria-labelledby="starter-resources-heading"
          className={`mt-8 rounded-3xl border border-gold/25 bg-card p-5 shadow-elegant transition duration-500 sm:p-6 ${unlocked ? "scale-[1.01] shadow-glow" : ""}`}
        >
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-gold/15 text-gold">
              <Sparkles className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
                Gift unlocked
              </p>
              <h2 id="starter-resources-heading" className="font-display text-xl font-bold">
                My Starter Resources
              </h2>
            </div>
          </div>
          <div className="mt-5">
            <article className="rounded-2xl border border-border bg-muted/35 p-4">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden="true" />
                <div>
                  <h3 className="font-display font-semibold">{WELCOME_GIFT.pdf.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">PDF starter resource</p>
                </div>
              </div>
              <div className="mt-4">
                <Link
                  to="/dashboard/gift/$giftId"
                  params={{ giftId: WELCOME_GIFT.id }}
                  className="inline-flex min-h-10 items-center rounded-full bg-gradient-gold px-4 text-xs font-bold text-primary-foreground shadow-glow"
                >
                  View PDF
                </Link>
              </div>
            </article>
          </div>
        </section>
      ) : (
        <section className="mt-8 flex flex-col gap-5 rounded-3xl border border-gold/25 bg-gradient-to-br from-gold/10 via-card to-card p-6 shadow-elegant sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
              <Gift className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
                Your BLACKPIPS Welcome Gift
              </p>
              <h2 className="mt-1 font-display text-xl font-bold">
                Claim your free starter resources
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">BLACKPIPS Starter Guide PDF.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleClaim()}
            disabled={claiming}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-gold px-5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-65"
          >
            {claiming ? <Loader2 className="size-4 animate-spin" /> : <Gift className="size-4" />}
            {claiming ? "Unlocking…" : "Claim Gift"}
          </button>
        </section>
      )}

      <Dialog open={modalOpen && !claimed} onOpenChange={handleModalChange}>
        <DialogContent className="w-[calc(100%-2rem)] overflow-hidden rounded-3xl border-gold/30 bg-card p-0 shadow-glow sm:max-w-md">
          <div className="bg-gradient-to-br from-gold/20 via-card to-card px-6 pb-6 pt-8 text-center sm:px-8">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-gold/15 text-gold shadow-glow">
              <Gift className="size-7" aria-hidden="true" />
            </div>
            <DialogTitle className="mt-5 font-display text-2xl font-bold">
              {WELCOME_GIFT.title}
            </DialogTitle>
            <DialogDescription className="mt-2">{WELCOME_GIFT.description}</DialogDescription>
            <div className="mx-auto mt-5 max-w-xs rounded-2xl border border-border bg-background/50 p-4 text-left text-sm">
              <p className="flex items-center gap-2">
                <FileText className="size-4 text-gold" /> Starter PDF
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleClaim()}
              disabled={claiming}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-gold px-5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-65"
            >
              {claiming ? <Loader2 className="size-4 animate-spin" /> : <Gift className="size-4" />}
              {claiming ? "Unlocking…" : "Claim My Gift"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
