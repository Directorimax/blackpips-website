import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { CONTACT_UNAVAILABLE_MESSAGE } from "@/lib/contact-availability";
import { cn } from "@/lib/utils";
import { useContactAvailability } from "@/hooks/useContactAvailability";

type AvailabilityAwareContactLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

export function AvailabilityAwareContactLink({
  href,
  className,
  onClick,
  tabIndex,
  title,
  children,
  ...props
}: AvailabilityAwareContactLinkProps) {
  const { isOpen, isReady } = useContactAvailability();
  const enabled = isReady && isOpen;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!enabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  }

  return (
    <a
      {...props}
      href={enabled ? href : undefined}
      role={!enabled ? "link" : props.role}
      aria-disabled={!enabled || undefined}
      aria-describedby={!enabled ? "contact-availability-disabled-description" : undefined}
      tabIndex={!enabled ? -1 : tabIndex}
      title={!enabled ? CONTACT_UNAVAILABLE_MESSAGE : title}
      data-contact-availability={isReady ? (isOpen ? "open" : "closed") : "checking"}
      onClick={handleClick}
      className={cn(
        className,
        !enabled && "cursor-not-allowed opacity-55 grayscale-[0.2] hover:translate-y-0",
      )}
    >
      {children}
    </a>
  );
}
