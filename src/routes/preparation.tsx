import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MapPin, Plus, Route as RouteIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { BoutonScanner, ScannerDialog } from "@/components/Scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { chargerArticles, chargerStockDisponible, preleverPalette } from "@/lib/stock";
import { calculerParcours, type LigneDemande, type Mission } from "@/lib/preparation";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/preparation")({
  head: () => ({
    meta: [
      { title: "Préparation — Stock Palettes" },
      { name: "description", content: "Préparer une commande : parcours optimisé par palette et prélèvement des quantités." },
      { property: "og:title", content: "Préparation — Stock Palettes" },
      { property: "og:description", content: "Parcours de préparation regroupé par palette avec mise à jour du stock." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PagePreparation,
});

type LigneSaisie = { article_id: string; quantite: string };

function PagePreparation() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const articles = useQuery({ queryKey: ["articles"], queryFn: chargerArticles, enabled: !!user });
  const [saisie, setSaisie] = useState<LigneSaisie[]>([{ article_id: "", quantite: "" }]);
  const [demande, setDemande] = useState<LigneDemande[] | null>(null);
  const [preleve, setPreleve] = useState<Record<string, number>>({});
  const [missionOuverte, setMissionOuverte] = useState<Mission | null>(null);

  const stock = useQuery({
    queryKey: ["stock", "preparation"],
    queryFn: chargerStockDisponible,
    enabled: !!user && !!demande,
  });

  const besoins = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of demande ?? []) m.set(d.article_id, Math.max(0, d.quantite - (preleve[d.article_id] ?? 0)));
    return m;
  }, [demande, preleve]);

  const missions = useMemo(
    () => (stock.data ? calculerParcours(besoins, stock.data) : []),
    [besoins, stock.data],
  );

  const nomArticle = (id: string) => {
    const a = articles.data?.find((x) => x.id === id);
    return a ? `${a.reference} — ${a.designation}` : "—";
  };

  const calculer = () => {
    const lignes = saisie
      .filter((l) => l.article_id && Number(l.quantite) > 0)
      .map((l) => ({ article_id: l.article_id, quantite: Math.floor(Number(l.quantite)) }));
    const ids = lignes.map((l) => l.article_id);
    if (!lignes.length) return toast.error("Ajoutez au moins une référence avec une quantité.");
    if (new Set(ids).size !== ids.length) return toast.error("Une référence ne peut apparaître qu'une fois.");
    setPreleve({});
    setDemande(lignes);
    void qc.invalidateQueries({ queryKey: ["stock", "preparation"] });
  };

  const totalDemande = (demande ?? []).reduce((s, d) => s + d.quantite, 0);
  const totalPreleve = (demande ?? []).reduce((s, d) => s + Math.min(d.quantite, preleve[d.article_id] ?? 0), 0);

  return (
    <AppShell titre="Préparation">
      <p className="mb-4 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
        Démonstration : la validation d'une palette diminue le stock réel.
      </p>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-(--shadow-panel)">
        <h2 className="font-display text-xl uppercase tracking-wide">Demande</h2>
        {saisie.map((l, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_6rem_auto] items-end gap-2">
            <div className="min-w-0">
              <Label className="text-xs">Référence</Label>
              <Select
                value={l.article_id}
                onValueChange={(v) => setSaisie((s) => s.map((x, j) => (j === i ? { ...x, article_id: v } : x)))}
              >
                <SelectTrigger className="h-12"><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  {(articles.data ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.reference} — {a.designation}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Quantité</Label>
              <Input
                className="h-12"
                type="number"
                min={1}
                inputMode="numeric"
                value={l.quantite}
                onChange={(e) => setSaisie((s) => s.map((x, j) => (j === i ? { ...x, quantite: e.target.value } : x)))}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-12"
              aria-label="Supprimer la ligne"
              disabled={saisie.length === 1}
              onClick={() => setSaisie((s) => s.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" className="h-12 gap-2" onClick={() => setSaisie((s) => [...s, { article_id: "", quantite: "" }])}>
            <Plus className="size-4" /> Ajouter une référence
          </Button>
          <Button className="h-12 gap-2" onClick={calculer}>
            <RouteIcon className="size-4" /> Calculer le parcours
          </Button>
        </div>
      </section>

      {demande && (
        <>
          <section className="mt-6">
            <h2 className="mb-2 font-display text-xl uppercase tracking-wide">Progression</h2>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary" style={{ width: `${totalDemande ? (totalPreleve / totalDemande) * 100 : 0}%` }} />
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {demande.map((d) => {
                const fait = preleve[d.article_id] ?? 0;
                return (
                  <li key={d.article_id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <span className="truncate">{nomArticle(d.article_id)}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {fait} / {d.quantite} · reliquat {Math.max(0, d.quantite - fait)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="mt-6">
            <h2 className="mb-3 font-display text-xl uppercase tracking-wide">Parcours</h2>
            {stock.isLoading && <p className="text-sm text-muted-foreground">Calcul…</p>}
            {stock.data && missions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {totalPreleve >= totalDemande ? "Préparation terminée." : "Aucune palette disponible pour le besoin restant."}
              </p>
            )}
            <ul className="space-y-3">
              {missions.map((m, idx) => (
                <li key={m.palette_id} className="rounded-xl border border-border bg-card p-4 shadow-(--shadow-panel)">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <p className="truncate font-semibold">{idx + 1}. {m.numero}</p>
                    <span className="flex shrink-0 items-center gap-1 text-sm text-primary">
                      <MapPin className="size-4" /> {m.emplacement}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {m.lignes.map((l) => (
                      <li key={l.article_id}>
                        <p className="truncate font-medium">{l.reference} — {l.designation}</p>
                        <p className="text-xs text-muted-foreground">
                          Disponible {l.disponible} · Proposé {l.propose} · Besoin restant {l.besoin_restant}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-3 h-12 w-full" onClick={() => setMissionOuverte(m)}>
                    Préparer cette palette
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {missionOuverte && (
        <DialogMission
          mission={missionOuverte}
          onClose={() => setMissionOuverte(null)}
          onValide={async (lignes) => {
            await preleverPalette(missionOuverte.palette_id, lignes);
            setPreleve((p) => {
              const n = { ...p };
              for (const l of lignes) n[l.article_id] = (n[l.article_id] ?? 0) + l.quantite;
              return n;
            });
            setMissionOuverte(null);
            await qc.invalidateQueries();
            toast.success(`Palette ${missionOuverte.numero} préparée.`);
          }}
        />
      )}
    </AppShell>
  );
}

function DialogMission({
  mission,
  onClose,
  onValide,
}: {
  mission: Mission;
  onClose: () => void;
  onValide: (lignes: { article_id: string; quantite: number }[]) => Promise<void>;
}) {
  const [scanOuvert, setScanOuvert] = useState(false);
  const [code, setCode] = useState("");
  const [confirmee, setConfirmee] = useState(false);
  const [quantites, setQuantites] = useState<Record<string, string>>(
    Object.fromEntries(mission.lignes.map((l) => [l.article_id, String(l.propose)])),
  );
  const [enCours, setEnCours] = useState(false);

  const verifier = useCallback(
    (valeur: string) => {
      setScanOuvert(false);
      setCode(valeur);
      if (valeur.trim().toLowerCase() === mission.numero.toLowerCase()) {
        setConfirmee(true);
      } else {
        setConfirmee(false);
        toast.error(`Palette incorrecte : attendu ${mission.numero}.`);
      }
    },
    [mission.numero],
  );

  const valider = async () => {
    const lignes = mission.lignes.map((l) => ({
      article_id: l.article_id,
      quantite: Math.max(0, Math.floor(Number(quantites[l.article_id] || 0))),
    }));
    const trop = mission.lignes.find((l) => lignes.find((x) => x.article_id === l.article_id)!.quantite > l.disponible);
    if (trop) return toast.error(`Quantité supérieure au disponible pour ${trop.reference}.`);
    setEnCours(true);
    try {
      await onValide(lignes);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-background">
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <h2 className="truncate font-display text-2xl uppercase">{mission.numero}</h2>
          <Button variant="ghost" onClick={onClose}>Fermer</Button>
        </div>
        <p className="flex items-center gap-1 text-sm text-primary"><MapPin className="size-4" /> {mission.emplacement}</p>

        {!confirmee ? (
          <div className="space-y-3">
            <BoutonScanner label="Scanner la palette" onClick={() => setScanOuvert(true)} />
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <Input className="h-12" placeholder="Ou saisir le numéro" value={code} onChange={(e) => setCode(e.target.value)} />
              <Button className="h-12" variant="secondary" onClick={() => verifier(code)}>Vérifier</Button>
            </div>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <CheckCircle2 className="size-5" /> Palette confirmée
          </p>
        )}

        <ul className="space-y-3">
          {mission.lignes.map((l) => (
            <li key={l.article_id} className="rounded-lg border border-border bg-card p-3">
              <p className="font-medium">{l.reference} — {l.designation}</p>
              <p className="text-xs text-muted-foreground">Disponible {l.disponible} · Proposé {l.propose}</p>
              <Label className="mt-2 block text-xs">Quantité prélevée</Label>
              <Input
                className="h-12"
                type="number"
                min={0}
                max={l.disponible}
                inputMode="numeric"
                disabled={!confirmee}
                value={quantites[l.article_id]}
                onChange={(e) => setQuantites((q) => ({ ...q, [l.article_id]: e.target.value }))}
              />
            </li>
          ))}
        </ul>

        <Button className="h-14 w-full text-base" disabled={!confirmee || enCours} onClick={valider}>
          Valider la palette
        </Button>
      </div>
      <ScannerDialog open={scanOuvert} titre="Scanner la palette" onClose={() => setScanOuvert(false)} onResult={verifier} />
    </div>
  );
}
