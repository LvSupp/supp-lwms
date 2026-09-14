import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
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
  chargerArticles,
  chargerEmplacements,
  creerPalette,
  trouverEmplacement,
} from "@/lib/stock";

export const Route = createFileRoute("/creation")({
  head: () => ({
    meta: [
      { title: "Créer une palette — Stock Palettes" },
      {
        name: "description",
        content:
          "Créez une palette avec son article, sa quantité, son lot et son emplacement. Le numéro est généré automatiquement.",
      },
      { property: "og:title", content: "Créer une palette — Stock Palettes" },
      {
        property: "og:description",
        content: "Nouvelle palette : article, quantité, lot, emplacement et numéro unique automatique.",
      },
    ],
  }),
  component: PageCreation,
});

function PageCreation() {
  const queryClient = useQueryClient();
  const articles = useQuery({ queryKey: ["articles"], queryFn: chargerArticles });
  const emplacements = useQuery({ queryKey: ["emplacements"], queryFn: chargerEmplacements });

  const [articleId, setArticleId] = useState("");
  const [quantite, setQuantite] = useState("1");
  const [lot, setLot] = useState("");
  const [emplacementId, setEmplacementId] = useState("");
  const [scannerOuvert, setScannerOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [creee, setCreee] = useState<string | null>(null);

  const valider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleId || !emplacementId) {
      toast.error("Choisissez un article et un emplacement.");
      return;
    }
    setEnCours(true);
    try {
      const palette = await creerPalette({
        article_id: articleId,
        quantite: Number(quantite),
        lot,
        emplacement_id: emplacementId,
      });
      setCreee(palette.numero);
      setQuantite("1");
      setLot("");
      void queryClient.invalidateQueries();
      toast.success(`Palette ${palette.numero} créée.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Création impossible.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <AppShell titre="Créer une palette">
      {creee && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-border bg-card p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
          <div className="min-w-0">
            <p className="font-semibold">Palette créée</p>
            <p className="font-display text-3xl leading-none">{creee}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Notez ce numéro sur l'étiquette de la palette.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={valider} className="space-y-5">
        <div className="space-y-2">
          <Label>Article</Label>
          <Select value={articleId} onValueChange={setArticleId}>
            <SelectTrigger className="h-14 w-full text-base">
              <SelectValue placeholder="Choisir un article" />
            </SelectTrigger>
            <SelectContent>
              {(articles.data ?? []).map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.reference} — {a.designation}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantite">Quantité</Label>
          <Input
            id="quantite"
            type="number"
            min={1}
            inputMode="numeric"
            value={quantite}
            onChange={(e) => setQuantite(e.target.value)}
            className="h-14 text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lot">Lot</Label>
          <Input
            id="lot"
            value={lot}
            onChange={(e) => setLot(e.target.value)}
            placeholder="Numéro de lot (optionnel)"
            className="h-14 text-base"
          />
        </div>

        <div className="space-y-2">
          <Label>Emplacement</Label>
          <Select value={emplacementId} onValueChange={setEmplacementId}>
            <SelectTrigger className="h-14 w-full text-base">
              <SelectValue placeholder="Choisir un emplacement" />
            </SelectTrigger>
            <SelectContent>
              {(emplacements.data ?? []).map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.code} · {e.sites?.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <BoutonScanner
            onClick={() => setScannerOuvert(true)}
            label="Scanner l'emplacement"
          />
        </div>

        <Button
          type="submit"
          disabled={enCours}
          className="h-14 w-full text-base font-semibold"
        >
          Créer la palette
        </Button>
      </form>

      <ScannerDialog
        open={scannerOuvert}
        titre="Scanner l'emplacement"
        onClose={() => setScannerOuvert(false)}
        onResult={async (valeur) => {
          setScannerOuvert(false);
          const emplacement = await trouverEmplacement(valeur);
          if (!emplacement) {
            toast.error(`Emplacement « ${valeur} » inconnu.`);
            return;
          }
          setEmplacementId(emplacement.id);
          toast.success(`Emplacement ${emplacement.code} sélectionné.`);
        }}
      />
    </AppShell>
  );
}
