import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Boxes } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — Stock Palettes" },
      {
        name: "description",
        content: "Connectez-vous pour gérer le stock de palettes de votre entrepôt.",
      },
      { property: "og:title", content: "Connexion — Stock Palettes" },
      {
        property: "og:description",
        content: "Connectez-vous pour gérer le stock de palettes de votre entrepôt.",
      },
    ],
  }),
  component: PageAuth,
});

function PageAuth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"connexion" | "inscription">("connexion");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [nom, setNom] = useState("");
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/" });
  }, [loading, user, navigate]);

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnCours(true);
    try {
      if (mode === "connexion") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
        if (error) throw error;
        void navigate({ to: "/" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: motDePasse,
          options: {
            data: { nom: nom || email.split("@")[0] },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (data.session) {
          void navigate({ to: "/" });
        } else {
          toast.success("Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse.");
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? traduireErreur(error.message) : "Une erreur est survenue.",
      );
    } finally {
      setEnCours(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Connexion Google impossible.");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen flex-col justify-center px-5 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Boxes className="size-7" />
          </div>
          <h1 className="font-display text-4xl uppercase leading-none">Stock Palettes</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gestion et localisation des palettes en entrepôt
          </p>
        </div>

        <form onSubmit={soumettre} className="space-y-4">
          {mode === "inscription" && (
            <div className="space-y-2">
              <Label htmlFor="nom">Nom</Label>
              <Input
                id="nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Prénom Nom"
                autoComplete="name"
                className="h-13"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Adresse e-mail</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="h-13"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mdp">Mot de passe</Label>
            <Input
              id="mdp"
              type="password"
              required
              minLength={6}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              autoComplete={mode === "connexion" ? "current-password" : "new-password"}
              className="h-13"
            />
          </div>
          <Button type="submit" disabled={enCours} className="h-14 w-full text-base font-semibold">
            {mode === "connexion" ? "Se connecter" : "Créer mon compte"}
          </Button>
        </form>

        <Button variant="secondary" onClick={google} className="mt-3 h-14 w-full text-base">
          Continuer avec Google
        </Button>

        <button
          type="button"
          onClick={() => setMode(mode === "connexion" ? "inscription" : "connexion")}
          className="mt-6 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {mode === "connexion"
            ? "Pas encore de compte ? Créer un compte"
            : "J'ai déjà un compte : me connecter"}
        </button>
      </div>
    </div>
  );
}

function traduireErreur(message: string) {
  if (message.includes("Invalid login credentials")) return "E-mail ou mot de passe incorrect.";
  if (message.includes("already registered")) return "Cette adresse e-mail est déjà utilisée.";
  if (message.includes("Email not confirmed")) return "Confirmez votre adresse e-mail avant de vous connecter.";
  return message;
}
