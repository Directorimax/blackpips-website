export const LEARNING_ACTIVITY_FLUSH_SECONDS = 45;
export const LEARNING_ACTIVITY_IDLE_MS = 90_000;

export type LearningActivityEvent = {
  eventId: string;
  activeSeconds: number;
  activityDate: string;
};

type TrackerOptions = {
  timezone: string;
  now?: () => number;
  createId?: () => string;
  activityDate?: (timezone: string) => string;
  record: (event: LearningActivityEvent) => Promise<void>;
};

export function validIanaTimezone(candidate: string | null | undefined) {
  const value = candidate?.trim();
  if (!value) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return value;
  } catch {
    return null;
  }
}

export function localDateInTimezone(timezone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export class LearningActivityTracker {
  private readonly now: () => number;
  private readonly createId: () => string;
  private readonly dateForTimezone: (timezone: string) => string;
  private activeSince: number | null = null;
  private accumulatedMs = 0;
  private queue: LearningActivityEvent[] = [];
  private draining = false;
  private disposed = false;

  constructor(private readonly options: TrackerOptions) {
    this.now = options.now ?? (() => performance.now());
    this.createId = options.createId ?? (() => crypto.randomUUID());
    this.dateForTimezone = options.activityDate ?? localDateInTimezone;
  }

  setActive(active: boolean) {
    if (this.disposed) return;
    this.capture();
    if (active && this.activeSince === null) this.activeSince = this.now();
    if (!active) {
      this.activeSince = null;
      void this.flush();
    }
  }

  pulse() {
    if (this.disposed) return;
    this.capture();
    if (this.accumulatedMs >= LEARNING_ACTIVITY_FLUSH_SECONDS * 1000) void this.flush();
  }

  async flush() {
    if (this.disposed) return;
    this.capture();
    let seconds = Math.floor(this.accumulatedMs / 1000);
    if (seconds > 0) {
      this.accumulatedMs -= seconds * 1000;
      while (seconds > 0) {
        const activeSeconds = Math.min(seconds, 300);
        this.queue.push({
          eventId: this.createId(),
          activeSeconds,
          activityDate: this.dateForTimezone(this.options.timezone),
        });
        seconds -= activeSeconds;
      }
    }
    await this.drain();
  }

  async dispose() {
    if (this.disposed) return;
    this.capture();
    this.activeSince = null;
    await this.flush();
    this.disposed = true;
  }

  private capture() {
    if (this.activeSince === null) return;
    const current = this.now();
    this.accumulatedMs += Math.max(0, current - this.activeSince);
    this.activeSince = current;
  }

  private async drain() {
    if (this.draining || this.queue.length === 0) return;
    this.draining = true;
    try {
      while (this.queue.length > 0) {
        const event = this.queue[0];
        try {
          await this.options.record(event);
          this.queue.shift();
        } catch {
          // Keep this UUID and payload for the next lifecycle/periodic retry.
          break;
        }
      }
    } finally {
      this.draining = false;
    }
  }
}
