export type SessionLifecycleRole = "learner" | "admin" | "unknown";

export type InactivityPolicy = {
  timeoutMs: number;
  warningMs: number;
};

const MINUTE = 60_000;

export const SESSION_INACTIVITY_POLICY = {
  learner: { timeoutMs: 60 * MINUTE, warningMs: 5 * MINUTE },
  admin: { timeoutMs: 30 * MINUTE, warningMs: 5 * MINUTE },
  // Role loading uses the shorter administrator policy until the trusted profile resolves.
  unknown: { timeoutMs: 30 * MINUTE, warningMs: 5 * MINUTE },
} as const satisfies Record<SessionLifecycleRole, InactivityPolicy>;

export function getInactivityPolicy(role: SessionLifecycleRole): InactivityPolicy {
  return SESSION_INACTIVITY_POLICY[role];
}
