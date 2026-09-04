import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [resolvedRole, setResolvedRole] = useState<{
    userId: string | null;
    isAdmin: boolean;
  }>({ userId: null, isAdmin: false });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setResolvedRole({ userId: null, isAdmin: false });
      return;
    }
    let active = true;
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("Could not load administrator role:", error);
        if (!active) return;
        setResolvedRole({ userId: user.id, isAdmin: data?.role === "admin" });
      });
    return () => {
      active = false;
    };
  }, [authLoading, user]);

  const roleMatchesCurrentUser = Boolean(user && resolvedRole.userId === user.id);
  return {
    isAdmin: roleMatchesCurrentUser && resolvedRole.isAdmin,
    loading: authLoading || Boolean(user && !roleMatchesCurrentUser),
  };
}
