import { createContext } from "react";
import type { ContactAvailability } from "@/lib/contact-availability";

export type ContactAvailabilityContextValue = ContactAvailability & { isReady: boolean };

export const ContactAvailabilityContext = createContext<ContactAvailabilityContextValue | null>(
  null,
);
