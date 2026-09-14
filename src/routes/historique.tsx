import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { chargerMouvements, formaterDate } from "@/lib/stock";

export const Route = createFileRoute("/historique")({
  head: () => ({
    meta: [
      { title: "Historique des mouvements — Stock Palettes" },
      {
        name: "description",
        content:
          "Tous les mouvements de palettes : date, palette, emplacement source, destination et utilisateur.",
      },
      { property: "og:title", content: "Historique des mouvements — Stock Palettes" },
      {
        property: "og:description",
        content: "Journal complet des entrées et déplacements de palettes dans l'entrepôt.",
      },
    ],
  }),
  component: PageHistorique,
});

function PageHistorique() {
  const mouvements = useQuery({ queryKey: ["mouvements"], queryFn: () => chargerMouvements(200) });

  return (
    <AppShell titre="Historique">
      {mouvements.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      <ul className="space-y-2">
        {(mouvements.data ?? []).map((m) => (
          <li
            key={m.id}
            className="rounded-lg border border-border bg-card p-3 shadow-(--shadow-panel)"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <p className="truncate font-display text-2xl leading-none">{m.palettes?.numero}</p>
              <span className="shrink-0 rounded bg-secondary px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide">
                {m.type === "ENTREE" ? "Entrée" : "Déplacement"}
              </span>
            </div>
            <p className="mt-2 flex items-center gap-2 text-sm">
              <span className="rounded bg-secondary px-2 py-0.5">{m.source?.code ?? "—"}</span>
              <ArrowRight className="size-4 shrink-0 text-primary" />
              <span className="rounded bg-primary px-2 py-0.5 font-semibold text-primary-foreground">
                {m.destination?.code ?? "—"}
              </span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {formaterDate(m.created_at)} · {m.utilisateur_nom ?? "—"}
            </p>
          </li>
        ))}
      </ul>
      {mouvements.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun mouvement enregistré pour le moment.</p>
      )}
    </AppShell>
  );
}
