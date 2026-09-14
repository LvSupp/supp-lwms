import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { BoutonScanner, ScannerDialog } from "@/components/Scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formaterDate, trouverPalette, type PaletteDetail } from "@/lib/stock";

export const Route = createFileRoute("/recherche")({
  head: () => ({
    meta: [
      { title: "Rechercher une palette — Stock Palettes" },
      {
        name: "description",
        content:
          "Scannez un QR code ou un code-barres, ou saisissez un numéro pour localiser instantanément une palette.",
      },
      { property: "og:title", content: "Rechercher une palette — Stock Palettes" },
      {
        property: "og:description",
        content: "Scannez ou saisissez un numéro de palette pour connaître son emplacement actuel.",
      },
    ],
  }),
  component: PageRecherche,
});

function PageRecherche() {
  const [numero, setNumero] = useState("");
  const [scannerOuvert, setScannerOuvert] = useState(false);
  const [palette, setPalette] = useState<PaletteDetail | null>(null);
  const [cherche, setCherche] = useState(false);

  const rechercher = async (valeur: string) => {
    if (!valeur.trim()) return;
    setCherche(true);
    try {
      const resultat = await trouverPalette(valeur);
      setPalette(resultat);
      if (!resultat) toast.error(`Aucune palette trouvée pour « ${valeur} ».`);
    } catch {
      toast.error("La recherche a échoué. Réessayez.");
    } finally {
      setCherche(false);
    }
  };

  return (
    <AppShell titre="Rechercher">
      <div className="space-y-4">
        <BoutonScanner onClick={() => setScannerOuvert(true)} label="Scanner la palette" />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void rechercher(numero);
          }}
          className="space-y-2"
        >
          <Label htmlFor="numero">Ou saisir le numéro de palette</Label>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Input
              id="numero"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="PAL-000001"
              className="h-14 text-base"
              autoCapitalize="characters"
            />
            <Button type="submit" size="icon" className="h-14 w-14" aria-label="Rechercher">
              <Search className="size-5" />
            </Button>
          </div>
        </form>

        {cherche && <p className="text-sm text-muted-foreground">Recherche…</p>}

        {palette && (
          <div className="rounded-xl border border-border bg-card p-4 shadow-(--shadow-panel)">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Palette</p>
            <p className="font-display text-3xl leading-none">{palette.numero}</p>
            <dl className="mt-4 space-y-3 text-sm">
              <Ligne libelle="Article">
                {palette.articles?.reference} — {palette.articles?.designation}
              </Ligne>
              <Ligne libelle="Quantité">{palette.quantite}</Ligne>
              <Ligne libelle="Lot">{palette.lot ?? "—"}</Ligne>
              <Ligne libelle="Emplacement actuel">
                <span className="rounded bg-primary px-2 py-0.5 font-semibold text-primary-foreground">
                  {palette.emplacements?.code ?? "Non affectée"}
                </span>
                {palette.emplacements?.sites?.nom ? (
                  <span className="ml-2 text-muted-foreground">
                    {palette.emplacements.sites.nom}
                  </span>
                ) : null}
              </Ligne>
              <Ligne libelle="Statut">{palette.statut}</Ligne>
              <Ligne libelle="Créée le">{formaterDate(palette.created_at)}</Ligne>
            </dl>
          </div>
        )}
      </div>

      <ScannerDialog
        open={scannerOuvert}
        titre="Scanner la palette"
        onClose={() => setScannerOuvert(false)}
        onResult={(valeur) => {
          setScannerOuvert(false);
          setNumero(valeur);
          void rechercher(valeur);
        }}
      />
    </AppShell>
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
