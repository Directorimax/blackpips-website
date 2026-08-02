export type NumericFieldRules = {
  min: number;
  max: number;
  integer: boolean;
  label: string;
};

export function acceptsNumericInput(raw: string, integer: boolean) {
  return integer ? /^\d*$/.test(raw) : /^\d*(?:\.\d*)?$/.test(raw);
}

export function validateNumericInput(raw: string, rules: NumericFieldRules) {
  if (raw === "") return { valid: false as const, error: `${rules.label} is required.` };
  const completePattern = rules.integer ? /^\d+$/ : /^\d+(?:\.\d+)?$/;
  if (!completePattern.test(raw)) {
    return {
      valid: false as const,
      error: rules.integer
        ? `${rules.label} must be a whole number.`
        : `${rules.label} must be a valid number.`,
    };
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return { valid: false as const, error: `${rules.label} must be a finite number.` };
  }
  if (rules.integer && !Number.isInteger(value)) {
    return { valid: false as const, error: `${rules.label} must be a whole number.` };
  }
  if (value < rules.min || value > rules.max) {
    return {
      valid: false as const,
      error: `${rules.label} must be between ${rules.min} and ${rules.max}.`,
    };
  }
  return { valid: true as const, value };
}
