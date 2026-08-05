import { createContext, useContext } from "react";

type SessionLifecycleContextValue = {
  setLessonVideoPlaying: (playing: boolean) => void;
};

export const SessionLifecycleContext = createContext<SessionLifecycleContextValue | null>(null);

export function useSessionLifecycle() {
  const context = useContext(SessionLifecycleContext);
  if (!context) throw new Error("useSessionLifecycle must be used within SessionLifecycleProvider");
  return context;
}
