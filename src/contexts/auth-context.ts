import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: (options?: { scope?: "local" | "global"; broadcast?: boolean }) => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
