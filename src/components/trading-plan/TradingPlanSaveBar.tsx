import { Check, Loader2 } from "lucide-react";

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
    <div className="plan-savebar sm:flex sm:items-center sm:justify-between sm:gap-4">
      <div className="px-2 py-1 text-sm">
        {saving ? (
          "Saving your playbook..."
        ) : saved ? (
          <span className="inline-flex items-center gap-2 bull">
            <Check className="h-4 w-4" /> Saved
          </span>
        ) : hasChanges ? (
          <span className="gold">Unsaved changes</span>
        ) : lastSavedAt ? (
          "All changes saved"
        ) : (
          "Complete the required profile fields to save"
        )}
      </div>
      <button
        type="button"
        onClick={onSave}
        disabled={disabled}
        className="btn btn-gold mt-2 w-full sm:mt-0 sm:w-auto"
      >
        {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
        {saving ? "Saving..." : saved ? "Plan saved" : "Save Trading Plan"}
      </button>
    </div>
  );
}
