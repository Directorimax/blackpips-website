import * as Dialog from "@radix-ui/react-dialog";
import { ShieldAlert } from "lucide-react";

export function SessionExpiryDialog({
  open,
  secondsRemaining,
  onStaySignedIn,
  onLogout,
}: {
  open: boolean;
  secondsRemaining: number;
  onStaySignedIn: () => void;
  onLogout: () => void;
}) {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby="session-expiry-description"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
          className="fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background p-6 text-foreground shadow-2xl focus:outline-none sm:p-7"
        >
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </div>
          <Dialog.Title className="font-display text-xl font-bold">
            Your session is about to expire
          </Dialog.Title>
          <Dialog.Description
            id="session-expiry-description"
            className="mt-2 text-sm text-muted-foreground"
          >
            You will be signed out due to inactivity.
          </Dialog.Description>
          <p
            className="mt-5 text-3xl font-bold tabular-nums"
            aria-label={`${minutes} minutes ${seconds} seconds remaining`}
          >
            {minutes}:{String(seconds).padStart(2, "0")}
          </p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onLogout}
              className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Log out now
            </button>
            <button
              type="button"
              autoFocus
              onClick={onStaySignedIn}
              className="min-h-11 rounded-xl bg-gradient-gold px-4 text-sm font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Stay signed in
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
