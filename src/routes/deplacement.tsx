import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { BoutonScanner, ScannerDialog } from "@/components/Scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  chargerEmplacements,
  deplacerPalette,
  trouverEmplacement,
  trouverPalette,
  type Emplacement,
  type PaletteDetail,
} from "@/lib/stock";

export const Route = createFileRoute("/deplacement")({
  head: () => ({
    meta: [
      { title: "Déplacer une palette — Stock Palettes" },
      {
        name: "description",
        content:
          "Scannez une palette puis son emplacement de destination : l'emplacement est mis à jour et le mouvement enregistré.",
      },
      { property: "og:title", content: "Déplacer une palette — Stock Palettes" },
      {
        property: "og:description",
        content: "Scannez la palette, puis la destination : mise à jour et historique automatiques.",
      },
    ],
  }),
  component: PageDeplacement,
});

type Cible = "palette" | "emplacement" | null;

function PageDeplacement() {
  const queryClient = useQueryClient();
  const emplacements = useQuery({ queryKey: ["emplacements"], queryFn: chargerEmplacements });

  const [palette, setPalette] = useState<PaletteDetail | null>(null);
  const [saisiePalette, setSaisiePalette] = useState("");
  const [destination, setDestination] = useState<Emplacement | null>(null);
  const [scanner, setScanner] = useState<Cible>(null);
  const [enCours, setEnCours] = useState(false);
  const [termine, setTermine] = useState<{ numero: string; source: string; destination: string } | null>(
    null,
  );

  const chargerPalette = async (valeur: string) => {
    const resultat = await trouverPalette(valeur);
    if (!resultat) {
      toast.error(`Aucune palette « ${valeur} ».`);
      return;
    }
    setPalette(resultat);
    setSaisiePalette(resultat.numero);
  };

  const confirmer = async () => {
    if (!palette || !destination) return;
    setEnCours(true);
    try {
      await deplacerPalette(palette.id, destination.id);
      setTermine({
        numero: palette.numero,
        source: palette.emplacements?.code ?? "—",
        destination: destination.code,
      });
      setPalette(null);
      setDestination(null);
      setSaisiePalette("");
      void queryClient.invalidateQueries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Déplacement impossible.");
    } finally {
      setEnCours(false);
    }
  };

  if (termine) {
    return (
      <AppShell titre="Déplacement">
        <div className="rounded-xl border border-border bg-card p-5 text-center shadow-(--shadow-panel)">
          <CheckCircle2 className="mx-auto size-10 text-success" />
          <p className="mt-3 font-display text-3xl leading-none">{termine.numero}</p>
          <p className="mt-3 flex items-center justify-center gap-2 text-sm">
            <span className="rounded bg-secondary px-2 py-1">{termine.source}</span>
            <ArrowRight className="size-4 text-primary" />
            <span className="rounded bg-primary px-2 py-1 font-semibold text-primary-foreground">
              {termine.destination}
            </span>
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Emplacement mis à jour et mouvement enregistré dans l'historique.
          </p>
          <Button className="mt-5 h-14 w-full gap-2 text-base" onClick={() => setTermine(null)}>
            <RotateCcw className="size-5" />
            Nouveau déplacement
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell titre="Déplacer">
      <ol className="space-y-6">
        <li className="space-y-3">
          <Etape numero={1} titre="Scanner la palette" />
          <BoutonScanner onClick={() => setScanner("palette")} label="Scanner la palette" />
          <div className="space-y-2">
            <Label htmlFor="palette">Ou saisir le numéro</Label>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <Input
                id="palette"
                value={saisiePalette}
                onChange={(e) => setSaisiePalette(e.target.value)}
                placeholder="PAL-000001"
                className="h-14 text-base"
              />
              <Button
                type="button"
                variant="secondary"
                className="h-14"
                onClick={() => void chargerPalette(saisiePalette)}
              >
                Valider
              </Button>
            </div>
          </div>
          {palette && (
            <div className="rounded-lg border border-border bg-card p-3 text-sm">
              <p className="font-display text-2xl leading-none">{palette.numero}</p>
              <p className="mt-1 text-muted-foreground">
                {palette.articles?.designation} · Qté {palette.quantite} · Lot {palette.lot ?? "—"}
              </p>
              <p className="mt-1">
                Emplacement actuel :{" "}
                <span className="font-semibold">{palette.emplacements?.code ?? "Non affectée"}</span>
              </p>
            </div>
          )}
        </li>

        <li className="space-y-3">
          <Etape numero={2} titre="Scanner la destination" />
          <BoutonScanner
            onClick={() => setScanner("emplacement")}
            label="Scanner l'emplacement"
          />
          <div className="space-y-2">
            <Label>Ou choisir dans la liste</Label>
            <Select
              value={destination?.id ?? ""}
              onValueChange={(id) =>
                setDestination((emplacements.data ?? []).find((e) => e.id === id) ?? null)
              }
            >
              <SelectTrigger className="h-14 w-full text-base">
                <SelectValue placeholder="Emplacement de destination" />
              </SelectTrigger>
              <SelectContent>
                {(emplacements.data ?? []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.code} · {e.sites?.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </li>

        <li className="space-y-3">
          <Etape numero={3} titre="Confirmer" />
          <div className="flex items-center justify-center gap-3 rounded-lg border border-border bg-card px-3 py-4 text-sm">
            <span className="rounded bg-secondary px-2 py-1">
              {palette?.emplacements?.code ?? "—"}
            </span>
            <ArrowRight className="size-4 text-primary" />
            <span className="rounded bg-primary px-2 py-1 font-semibold text-primary-foreground">
              {destination?.code ?? "—"}
            </span>
          </div>
          <Button
            className="h-14 w-full text-base font-semibold"
            disabled={!palette || !destination || enCours}
            onClick={() => void confirmer()}
          >
            Confirmer le déplacement
          </Button>
        </li>
      </ol>

      <ScannerDialog
        open={scanner !== null}
        titre={scanner === "palette" ? "Scanner la palette" : "Scanner l'emplacement"}
        onClose={() => setScanner(null)}
        onResult={async (valeur) => {
          const cible = scanner;
          setScanner(null);
          if (cible === "palette") {
            await chargerPalette(valeur);
            return;
          }
          const emplacement = await trouverEmplacement(valeur);
          if (!emplacement) {
            toast.error(`Emplacement « ${valeur} » inconnu.`);
            return;
          }
          setDestination(emplacement);
          toast.success(`Destination ${emplacement.code}.`);
        }}
      />
    </AppShell>
  );
}

function Etape({ numero, titre }: { numero: number; titre: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-display text-lg text-primary-foreground">
        {numero}
      </span>
      <h2 className="min-w-0 truncate font-display text-xl uppercase tracking-wide">{titre}</h2>
    </div>
  );
}
