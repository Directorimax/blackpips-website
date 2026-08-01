import { useContext } from "react";
import { ContactAvailabilityContext } from "@/contexts/contact-availability-context";

export function useContactAvailability() {
  const context = useContext(ContactAvailabilityContext);
  if (!context) {
    throw new Error("useContactAvailability must be used within ContactAvailabilityProvider.");
  }
  return context;
}
