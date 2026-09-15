import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  nom: string;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
  nom: "",
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) setLoading(false);
    });
    void (async () => {
      const { data: { session: current } } = await supabase.auth.getSession();
      if (current) {
        setSession(current);
        setLoading(false);
        return;
      }
      // Accès direct : ouverture d'une session invité, sans création de compte.
      const { data: invite } = await supabase.auth.signInAnonymously();
      setSession(invite?.session ?? null);
      setLoading(false);
    })();
    return () => data.subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;
  const nom =
    (user?.user_metadata?.["nom"] as string | undefined) ??
    user?.email?.split("@")[0] ??
    (user ? "Invité" : "");

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        nom,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
