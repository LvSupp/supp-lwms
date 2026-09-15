import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Boxes, MapPin, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BoutonScanner, ScannerDialog } from "@/components/Scanner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  chargerArticle,
  chargerEmplacement,
  chargerMouvementsPalette,
  chargerPalette,
  chargerPalettesArticle,
  chargerPalettesEmplacement,
  chargerStockParArticle,
  formaterDate,
  rechercheGlobale,
} from "@/lib/stock";

export const Route = createFileRoute("/recherche")({
  head: () => ({
    meta: [
      { title: "Stock — Stock Palettes" },
      {
        name: "description",
        content:
          "Consultez le stock agrégé par article, les palettes et les emplacements de l'entrepôt.",
      },
      { property: "og:title", content: "Stock — Stock Palettes" },
      {
        property: "og:description",
        content: "Stock total par article, palettes associées et emplacements en un coup d'œil.",
      },
    ],
  }),
  component: PageStock,
});

type Vue =
  | { type: "liste" }
  | { type: "article"; id: string }
  | { type: "palette"; id: string }
  | { type: "emplacement"; id: string };

function PageStock() {
  const [terme, setTerme] = useState("");
  const [scannerOuvert, setScannerOuvert] = useState(false);
  const [pile, setPile] = useState<Vue[]>([{ type: "liste" }]);
  const vue = pile[pile.length - 1]!;

  const ouvrir = (v: Vue) => setPile((p) => [...p, v]);
  const retour = () => setPile((p) => (p.length > 1 ? p.slice(0, -1) : p));

  return (
    <AppShell titre="Stock">
      <div className="space-y-4">
        <form onSubmit={(e) => e.preventDefault()} className="space-y-2">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={terme}
                onChange={(e) => {
                  setTerme(e.target.value);
                  setPile([{ type: "liste" }]);
                }}
                placeholder="Article, référence, palette ou emplacement"
                className="h-14 pl-11 text-base"
              />
            </div>
            <Button
              type="button"
              size="icon"
              className="h-14 w-14"
              aria-label="Scanner"
              onClick={() => setScannerOuvert(true)}
            >
              <Search className="size-5" />
            </Button>
          </div>
        </form>

        {terme.trim() === "" && <BoutonScanner onClick={() => setScannerOuvert(true)} label="Scanner un code" />}

        {pile.length > 1 && (
          <Button variant="secondary" onClick={retour} className="h-11">
            <ArrowLeft className="size-4" /> Retour
          </Button>
        )}

        {vue.type === "liste" && terme.trim() === "" && <VueStock onArticle={(id) => ouvrir({ type: "article", id })} />}
        {vue.type === "liste" && terme.trim() !== "" && (
          <VueRecherche
            terme={terme.trim()}
            onArticle={(id) => ouvrir({ type: "article", id })}
            onPalette={(id) => ouvrir({ type: "palette", id })}
            onEmplacement={(id) => ouvrir({ type: "emplacement", id })}
          />
        )}
        {vue.type === "article" && (
          <DetailArticle
            id={vue.id}
            onPalette={(id) => ouvrir({ type: "palette", id })}
            onEmplacement={(id) => ouvrir({ type: "emplacement", id })}
          />
        )}
        {vue.type === "palette" && (
          <DetailPalette
            id={vue.id}
            onArticle={(id) => ouvrir({ type: "article", id })}
            onEmplacement={(id) => ouvrir({ type: "emplacement", id })}
          />
        )}
        {vue.type === "emplacement" && (
          <DetailEmplacement
            id={vue.id}
            onPalette={(id) => ouvrir({ type: "palette", id })}
            onArticle={(id) => ouvrir({ type: "article", id })}
          />
        )}
      </div>

      <ScannerDialog
        open={scannerOuvert}
        titre="Scanner"
        onClose={() => setScannerOuvert(false)}
        onResult={(valeur) => {
          setScannerOuvert(false);
          setPile([{ type: "liste" }]);
          setTerme(valeur);
        }}
      />
    </AppShell>
  );
}

/* ---------------- Vue stock globale ---------------- */

function VueStock({ onArticle }: { onArticle: (id: string) => void }) {
  const stock = useQuery({ queryKey: ["stock", "articles"], queryFn: chargerStockParArticle });

  if (stock.isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if ((stock.data ?? []).length === 0)
    return <p className="text-sm text-muted-foreground">Aucune palette en stock.</p>;

  return (
    <section>
      <h2 className="mb-3 font-display text-xl uppercase tracking-wide">Stock par article</h2>
      <ul className="space-y-2">
        {(stock.data ?? []).map((a) => (
          <li key={a.article_id}>
            <button
              type="button"
              onClick={() => onArticle(a.article_id)}
              className="w-full rounded-lg border border-border bg-card p-3 text-left shadow-(--shadow-panel)"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <span className="truncate font-semibold">{a.designation}</span>
                <ArrowRight className="size-4 shrink-0 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">{a.reference}</p>
              <p className="mt-1 text-sm">
                <span className="font-display text-2xl leading-none">{a.quantite_totale}</span> unités
                <span className="text-muted-foreground"> · {a.nb_palettes} palette{a.nb_palettes > 1 ? "s" : ""}</span>
              </p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------- Résultats de recherche ---------------- */

function VueRecherche({
  terme,
  onArticle,
  onPalette,
  onEmplacement,
}: {
  terme: string;
  onArticle: (id: string) => void;
  onPalette: (id: string) => void;
  onEmplacement: (id: string) => void;
}) {
  const res = useQuery({ queryKey: ["recherche", terme], queryFn: () => rechercheGlobale(terme) });

  if (res.isLoading) return <p className="text-sm text-muted-foreground">Recherche…</p>;
  const data = res.data;
  const vide =
    !data || (data.articles.length === 0 && data.palettes.length === 0 && data.emplacements.length === 0);
  if (vide) return <p className="text-sm text-muted-foreground">Aucun résultat pour « {terme} ».</p>;

  return (
    <div className="space-y-5">
      {data!.articles.length > 0 && (
        <section>
          <Titre icone={<Boxes className="size-4" />}>Articles</Titre>
          <ul className="space-y-2">
            {data!.articles.map((a) => (
              <li key={a.article_id}>
                <Carte onClick={() => onArticle(a.article_id)}>
                  <p className="truncate font-semibold">{a.designation}</p>
                  <p className="text-xs text-muted-foreground">{a.reference}</p>
                  <p className="mt-1 text-sm">
                    {a.quantite_totale} unités · {a.nb_palettes} palette{a.nb_palettes > 1 ? "s" : ""}
                  </p>
                </Carte>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data!.palettes.length > 0 && (
        <section>
          <Titre icone={<Boxes className="size-4" />}>Palettes</Titre>
          <ul className="space-y-2">
            {data!.palettes.map((p) => (
              <li key={p.id}>
                <Carte onClick={() => onPalette(p.id)}>
                  <p className="font-display text-2xl leading-none">{p.numero}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {p.articles?.designation} · {p.quantite} · {p.emplacements?.code ?? "Non affectée"}
                  </p>
                </Carte>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data!.emplacements.length > 0 && (
        <section>
          <Titre icone={<MapPin className="size-4" />}>Emplacements</Titre>
          <ul className="space-y-2">
            {data!.emplacements.map((e) => (
              <li key={e.id}>
                <Carte onClick={() => onEmplacement(e.id)}>
                  <p className="font-display text-2xl leading-none">{e.code}</p>
                  <p className="text-xs text-muted-foreground">{e.sites?.nom}</p>
                </Carte>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ---------------- Détails ---------------- */

function DetailArticle({
  id,
  onPalette,
  onEmplacement,
}: {
  id: string;
  onPalette: (id: string) => void;
  onEmplacement: (id: string) => void;
}) {
  const article = useQuery({ queryKey: ["article", id], queryFn: () => chargerArticle(id) });
  const palettes = useQuery({ queryKey: ["palettes", "article", id], queryFn: () => chargerPalettesArticle(id) });
  const total = (palettes.data ?? []).reduce((s, p) => s + p.quantite, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-(--shadow-panel)">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Article</p>
        <p className="font-display text-3xl leading-none">{article.data?.reference ?? "—"}</p>
        <p className="mt-1 text-sm">{article.data?.designation}</p>
        <p className="mt-3 text-sm">
          <span className="font-display text-3xl leading-none">{total}</span> unités en stock
        </p>
      </div>

      <section>
        <Titre icone={<Boxes className="size-4" />}>Palettes ({palettes.data?.length ?? 0})</Titre>
        <ul className="space-y-2">
          {(palettes.data ?? []).map((p) => (
            <li key={p.id}>
              <Carte onClick={() => onPalette(p.id)}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <span className="truncate font-semibold">{p.numero}</span>
                  <span className="shrink-0 text-sm">{p.quantite}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Emplacement : {p.emplacements?.code ?? "Non affectée"}
                </p>
              </Carte>
              {p.emplacements && (
                <button
                  type="button"
                  onClick={() => onEmplacement(p.emplacements!.id)}
                  className="mt-1 text-xs text-primary underline-offset-4 hover:underline"
                >
                  Voir l'emplacement {p.emplacements.code}
                </button>
              )}
            </li>
          ))}
          {palettes.data?.length === 0 && (
            <li className="text-sm text-muted-foreground">Aucune palette pour cet article.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function DetailPalette({
  id,
  onArticle,
  onEmplacement,
}: {
  id: string;
  onArticle: (id: string) => void;
  onEmplacement: (id: string) => void;
}) {
  const palette = useQuery({ queryKey: ["palette", id], queryFn: () => chargerPalette(id) });
  const mouvements = useQuery({
    queryKey: ["mouvements", "palette", id],
    queryFn: () => chargerMouvementsPalette(id),
  });
  const p = palette.data;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-(--shadow-panel)">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Palette</p>
        <p className="font-display text-3xl leading-none">{p?.numero ?? "—"}</p>
        <dl className="mt-4 space-y-3 text-sm">
          <Ligne libelle="Article">
            {p ? (
              <button
                type="button"
                onClick={() => onArticle(p.article_id)}
                className="text-left text-primary underline-offset-4 hover:underline"
              >
                {p.articles?.reference} — {p.articles?.designation}
              </button>
            ) : (
              "—"
            )}
          </Ligne>
          <Ligne libelle="Quantité">{p?.quantite ?? "—"}</Ligne>
          <Ligne libelle="Lot">{p?.lot ?? "—"}</Ligne>
          <Ligne libelle="Emplacement">
            {p?.emplacements ? (
              <button
                type="button"
                onClick={() => onEmplacement(p.emplacement_id!)}
                className="rounded bg-primary px-2 py-0.5 font-semibold text-primary-foreground"
              >
                {p.emplacements.code}
              </button>
            ) : (
              "Non affectée"
            )}
          </Ligne>
          <Ligne libelle="Statut">{p?.statut ?? "—"}</Ligne>
        </dl>
      </div>

      <section>
        <Titre>Historique des mouvements</Titre>
        <ul className="space-y-2">
          {(mouvements.data ?? []).map((m) => (
            <li key={m.id} className="rounded-lg border border-border bg-card p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="rounded bg-secondary px-2 py-0.5">{m.source?.code ?? "—"}</span>
                <ArrowRight className="size-4 shrink-0 text-primary" />
                <span className="rounded bg-primary px-2 py-0.5 font-semibold text-primary-foreground">
                  {m.destination?.code ?? "—"}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {m.type === "ENTREE" ? "Entrée" : "Déplacement"} · {formaterDate(m.created_at)} ·{" "}
                {m.utilisateur_nom ?? "—"}
              </p>
            </li>
          ))}
          {mouvements.data?.length === 0 && (
            <li className="text-sm text-muted-foreground">Aucun mouvement pour cette palette.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function DetailEmplacement({
  id,
  onPalette,
  onArticle,
}: {
  id: string;
  onPalette: (id: string) => void;
  onArticle: (id: string) => void;
}) {
  const emplacement = useQuery({ queryKey: ["emplacement", id], queryFn: () => chargerEmplacement(id) });
  const palettes = useQuery({
    queryKey: ["palettes", "emplacement", id],
    queryFn: () => chargerPalettesEmplacement(id),
  });
  const total = (palettes.data ?? []).reduce((s, p) => s + p.quantite, 0);
  const articles = new Map((palettes.data ?? []).map((p) => [p.article_id, p.articles]));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-(--shadow-panel)">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Emplacement</p>
        <p className="font-display text-3xl leading-none">{emplacement.data?.code ?? "—"}</p>
        <p className="mt-1 text-sm text-muted-foreground">{emplacement.data?.sites?.nom}</p>
        <p className="mt-3 text-sm">
          <span className="font-display text-3xl leading-none">{total}</span> unités stockées ·{" "}
          {palettes.data?.length ?? 0} palette{(palettes.data?.length ?? 0) > 1 ? "s" : ""}
        </p>
      </div>

      <section>
        <Titre icone={<Boxes className="size-4" />}>Articles présents</Titre>
        <ul className="space-y-2">
          {[...articles.entries()].map(([articleId, a]) => (
            <li key={articleId}>
              <Carte onClick={() => onArticle(articleId)}>
                <p className="truncate font-semibold">{a?.designation}</p>
                <p className="text-xs text-muted-foreground">{a?.reference}</p>
              </Carte>
            </li>
          ))}
          {articles.size === 0 && (
            <li className="text-sm text-muted-foreground">Aucun article sur cet emplacement.</li>
          )}
        </ul>
      </section>

      <section>
        <Titre icone={<Boxes className="size-4" />}>Palettes présentes</Titre>
        <ul className="space-y-2">
          {(palettes.data ?? []).map((p) => (
            <li key={p.id}>
              <Carte onClick={() => onPalette(p.id)}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <span className="truncate font-semibold">{p.numero}</span>
                  <span className="shrink-0 text-sm">{p.quantite}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.articles?.reference} — {p.articles?.designation}
                </p>
              </Carte>
            </li>
          ))}
          {palettes.data?.length === 0 && (
            <li className="text-sm text-muted-foreground">Aucune palette sur cet emplacement.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

/* ---------------- Éléments partagés ---------------- */

function Titre({ icone, children }: { icone?: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="mb-2 flex items-center gap-2 font-display text-xl uppercase tracking-wide">
      {icone ? <span className="text-primary">{icone}</span> : null}
      {children}
    </h2>
  );
}

function Carte({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-border bg-card p-3 text-left shadow-(--shadow-panel)"
    >
      {children}
    </button>
  );
}

function Ligne({ libelle, children }: { libelle: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2 border-t border-border pt-2">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{libelle}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}
