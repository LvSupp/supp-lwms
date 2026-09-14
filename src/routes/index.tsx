import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Boxes, MapPin, Activity, Search, PackagePlus, MoveRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { chargerStats, chargerMouvements, formaterDate } from "@/lib/stock";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Stock Palettes" },
      {
        name: "description",
        content:
          "Vue d'ensemble du stock : nombre de palettes, emplacements et mouvements du jour dans l'entrepôt.",
      },
      { property: "og:title", content: "Tableau de bord — Stock Palettes" },
      {
        property: "og:description",
        content: "Vue d'ensemble du stock de palettes : palettes, emplacements, mouvements du jour.",
      },
    ],
  }),
  component: PageAccueil,
});

function PageAccueil() {
  const { user, nom } = useAuth();

  const stats = useQuery({
    queryKey: ["stats"],
    queryFn: chargerStats,
    enabled: !!user,
  });

  const derniers = useQuery({
    queryKey: ["mouvements", "recents"],
    queryFn: () => chargerMouvements(5),
    enabled: !!user,
  });

  return (
    <AppShell titre="Tableau de bord">
      <p className="mb-4 text-sm text-muted-foreground">Bonjour {nom}, voici l'état du stock.</p>

      <div className="grid grid-cols-2 gap-3">
        <Carte
          className="col-span-2"
          icone={<Boxes className="size-5" />}
          valeur={stats.data?.palettes}
          libelle="Palettes en stock"
        />
        <Carte
          icone={<MapPin className="size-5" />}
          valeur={stats.data?.emplacements}
          libelle="Emplacements"
        />
        <Carte
          icone={<Activity className="size-5" />}
          valeur={stats.data?.mouvementsDuJour}
          libelle="Mouvements du jour"
        />
      </div>

      <div className="mt-6 grid gap-3">
        <Raccourci to="/recherche" icone={<Search className="size-5" />} label="Rechercher une palette" />
        <Raccourci to="/deplacement" icone={<MoveRight className="size-5" />} label="Déplacer une palette" />
        <Raccourci to="/creation" icone={<PackagePlus className="size-5" />} label="Créer une palette" />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-xl uppercase tracking-wide">Derniers mouvements</h2>
        <ul className="space-y-2">
          {(derniers.data ?? []).map((m) => (
            <li
              key={m.id}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-(--shadow-panel)"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <span className="truncate font-semibold">{m.palettes?.numero}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formaterDate(m.created_at)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {m.source?.code ?? "—"} → {m.destination?.code ?? "—"} · {m.utilisateur_nom ?? "—"}
              </p>
            </li>
          ))}
          {derniers.data?.length === 0 && (
            <li className="text-sm text-muted-foreground">Aucun mouvement enregistré.</li>
          )}
        </ul>
      </section>
    </AppShell>
  );
}

function Carte({
  icone,
  valeur,
  libelle,
  className = "",
}: {
  icone: React.ReactNode;
  valeur: number | undefined;
  libelle: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-4 shadow-(--shadow-panel) ${className}`}
    >
      <div className="flex items-center gap-2 text-primary">{icone}</div>
      <p className="mt-2 font-display text-4xl leading-none">{valeur ?? "—"}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{libelle}</p>
    </div>
  );
}

function Raccourci({
  to,
  icone,
  label,
}: {
  to: "/recherche" | "/creation" | "/deplacement";
  icone: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex h-14 items-center gap-3 rounded-lg border border-border bg-secondary px-4 font-semibold text-secondary-foreground"
    >
      <span className="text-primary">{icone}</span>
      {label}
    </Link>
  );
}
