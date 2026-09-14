import { useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Search, PackagePlus, MoveRight, History, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/", label: "Accueil", icon: LayoutDashboard },
  { to: "/recherche", label: "Rechercher", icon: Search },
  { to: "/creation", label: "Créer", icon: PackagePlus },
  { to: "/deplacement", label: "Déplacer", icon: MoveRight },
  { to: "/historique", label: "Historique", icon: History },
] as const;

export function AppShell({ titre, children }: { titre: string; children: ReactNode }) {
  const { user, loading, nom, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <p className="truncate text-[0.7rem] uppercase tracking-[0.18em] text-primary">
            Stock Palettes
          </p>
          <h1 className="truncate font-display text-2xl uppercase leading-tight">{titre}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden max-w-28 truncate text-sm text-muted-foreground sm:block">
            {nom}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Se déconnecter"
            onClick={async () => {
              await signOut();
              void navigate({ to: "/auth" });
            }}
          >
            <LogOut className="size-5" />
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur">
        <ul className="mx-auto flex max-w-2xl">
          {nav.map(({ to, label, icon: Icon }) => {
            const actif = pathname === to;
            return (
              <li key={to} className="flex-1">
                <Link
                  to={to}
                  className={`flex h-[4.25rem] flex-col items-center justify-center gap-1 text-[0.65rem] font-semibold uppercase tracking-wide transition-colors ${
                    actif ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="size-5" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
