import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TradingPlanSaveBar({
  saving,
  saved,
  hasChanges,
  valid,
  lastSavedAt,
  onSave,
}: {
  saving: boolean;
  saved: boolean;
  hasChanges: boolean;
  valid: boolean;
  lastSavedAt: string | null;
  onSave: () => void;
}) {
  const disabled = saving || !hasChanges || !valid;
  return (
    <div className="sticky bottom-4 z-20 mt-6 rounded-2xl border border-border bg-card/95 p-3 shadow-elegant backdrop-blur sm:flex sm:items-center sm:justify-between sm:gap-4">
      <div className="px-2 py-1 text-sm">
        {saving ? (
          "Saving your playbook..."
        ) : saved ? (
          <span className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4" /> Saved
          </span>
        ) : hasChanges ? (
          <span className="text-gold">Unsaved changes</span>
        ) : lastSavedAt ? (
          "All changes saved"
        ) : (
          "Complete the required profile fields to save"
        )}
      </div>
      <Button
        onClick={onSave}
        disabled={disabled}
        className="mt-2 w-full bg-gradient-gold text-primary-foreground shadow-glow sm:mt-0 sm:w-auto"
      >
        {saving && <Loader2 className="animate-spin" />}
        {saving ? "Saving..." : saved ? "Plan saved" : "Save Trading Plan"}
      </Button>
    </div>
  );
}
