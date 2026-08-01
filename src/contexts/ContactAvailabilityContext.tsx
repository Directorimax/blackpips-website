import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CONTACT_SCHEDULE,
  CONTACT_UNAVAILABLE_MESSAGE,
  getContactAvailability,
} from "@/lib/contact-availability";
import {
  ContactAvailabilityContext,
  type ContactAvailabilityContextValue,
} from "@/contexts/contact-availability-context";

const INITIAL_AVAILABILITY: ContactAvailabilityContextValue = {
  isReady: false,
  isOpen: false,
  currentStatus: "closed",
  nextTransition: new Date(0),
  countdownMilliseconds: 0,
  statusLabel: "Currently closed",
  transitionLabel: "Checking current availability…",
  scheduleLabel: CONTACT_SCHEDULE.scheduleLabel,
};

export function ContactAvailabilityProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const refresh = () => setNow(new Date());
    refresh();
    const intervalId = window.setInterval(refresh, 1000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const value = useMemo<ContactAvailabilityContextValue>(
    () => (now ? { ...getContactAvailability(now), isReady: true } : INITIAL_AVAILABILITY),
    [now],
  );

  return (
    <ContactAvailabilityContext.Provider value={value}>
      {children}
      <span id="contact-availability-disabled-description" className="sr-only">
        {CONTACT_UNAVAILABLE_MESSAGE}
      </span>
    </ContactAvailabilityContext.Provider>
  );
}
