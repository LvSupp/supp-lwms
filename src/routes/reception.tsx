import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Truck, AlertTriangle, Plus, Trash2, ChevronLeft, QrCode } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
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
import { DialogEtiquette } from "@/components/Etiquette";
import {
  LIBELLE_STATUT,
  ajouterListe,
  chargerListes,
  ecart,
  enregistrerReception,
  reliquat,
  statutLigne,
  type LigneAttendu,
  type ListeAttendus,
} from "@/lib/receptions";

export const Route = createFileRoute("/reception")({
  head: () => ({
    meta: [
      { title: "Réception — Stock Palettes" },
      {
        name: "description",
        content:
          "Créez des listes d'attendus par client, enregistrez les quantités reçues et suivez les reliquats et écarts.",
      },
      { property: "og:title", content: "Réception — Stock Palettes" },
      {
        property: "og:description",
        content: "Attendus, quantités reçues, reliquats et écarts de réception.",
      },
    ],
  }),
  component: PageReception,
});

type Onglet = "attendus" | "reception" | "reliquats";

function PageReception() {
  const [onglet, setOnglet] = useState<Onglet>("attendus");
  const [listes, setListes] = useState<ListeAttendus[]>([]);

  useEffect(() => setListes(chargerListes()), []);

  return (
    <AppShell titre="Réception">
      <div className="mb-5 grid grid-cols-3 gap-2">
        <OngletBouton
          actif={onglet === "attendus"}
          onClick={() => setOnglet("attendus")}
          icone={<ClipboardList className="size-4" />}
          label="Attendus"
        />
        <OngletBouton
          actif={onglet === "reception"}
          onClick={() => setOnglet("reception")}
          icone={<Truck className="size-4" />}
          label="Réception"
        />
        <OngletBouton
          actif={onglet === "reliquats"}
          onClick={() => setOnglet("reliquats")}
          icone={<AlertTriangle className="size-4" />}
          label="Reliquats"
        />
      </div>

      {onglet === "attendus" && <SectionAttendus listes={listes} setListes={setListes} />}
      {onglet === "reception" && <SectionReception listes={listes} setListes={setListes} />}
      {onglet === "reliquats" && <SectionReliquats listes={listes} />}
    </AppShell>
  );
}

function OngletBouton({
  actif,
  onClick,
  icone,
  label,
}: {
  actif: boolean;
  onClick: () => void;
  icone: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg border text-[0.7rem] font-semibold uppercase tracking-wide transition-colors ${
        actif
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-secondary text-secondary-foreground"
      }`}
    >
      {icone}
      {label}
    </button>
  );
}

/* ------------------------- Onglet 1 : Attendus ------------------------- */

type Brouillon = { reference: string; designation: string; quantiteAttendue: string };

const LIGNE_VIDE: Brouillon = { reference: "", designation: "", quantiteAttendue: "" };

function SectionAttendus({
  listes,
  setListes,
}: {
  listes: ListeAttendus[];
  setListes: (l: ListeAttendus[]) => void;
}) {
  const clientsConnus = [...new Set(listes.map((l) => l.client))];
  const [client, setClient] = useState("");
  const [saisieEnCours, setSaisieEnCours] = useState(false);
  const [lignes, setLignes] = useState<Brouillon[]>([LIGNE_VIDE]);

  const modifier = (index: number, champ: keyof Brouillon, valeur: string) =>
    setLignes((prec) => prec.map((l, i) => (i === index ? { ...l, [champ]: valeur } : l)));

  const enregistrer = () => {
    const valides = lignes
      .filter((l) => l.reference.trim() && Number(l.quantiteAttendue) > 0)
      .map((l) => ({
        id: crypto.randomUUID(),
        reference: l.reference.trim(),
        designation: l.designation.trim(),
        quantiteAttendue: Number(l.quantiteAttendue),
        quantiteRecue: 0,
      }));
    if (!client.trim()) {
      toast.error("Indiquez le client.");
      return;
    }
    if (valides.length === 0) {
      toast.error("Ajoutez au moins une ligne avec une référence et une quantité.");
      return;
    }
    setListes(ajouterListe({ client: client.trim(), lignes: valides }));
    setLignes([LIGNE_VIDE]);
    setSaisieEnCours(false);
    toast.success(`Liste d'attendus enregistrée pour ${client.trim()}.`);
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="client">Client</Label>
        {clientsConnus.length > 0 && (
          <Select value={client} onValueChange={setClient}>
            <SelectTrigger className="h-14 w-full text-base">
              <SelectValue placeholder="Client existant" />
            </SelectTrigger>
            <SelectContent>
              {clientsConnus.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Input
          id="client"
          value={client}
          onChange={(e) => setClient(e.target.value)}
          placeholder="Nom du client"
          className="h-14 text-base"
        />
      </div>

      {!saisieEnCours ? (
        <Button className="h-14 w-full text-base font-semibold" onClick={() => setSaisieEnCours(true)}>
          Créer une liste d'attendus
        </Button>
      ) : (
        <div className="space-y-3">
          {lignes.map((ligne, index) => (
            <div key={index} className="space-y-2 rounded-xl border border-border bg-card p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <Input
                  value={ligne.reference}
                  onChange={(e) => modifier(index, "reference", e.target.value)}
                  placeholder="Code référence"
                  className="h-12 text-base"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Supprimer la ligne"
                  onClick={() => setLignes((p) => p.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <Input
                value={ligne.designation}
                onChange={(e) => modifier(index, "designation", e.target.value)}
                placeholder="Désignation"
                className="h-12 text-base"
              />
              <Input
                type="number"
                min={1}
                inputMode="numeric"
                value={ligne.quantiteAttendue}
                onChange={(e) => modifier(index, "quantiteAttendue", e.target.value)}
                placeholder="Quantité attendue"
                className="h-12 text-base"
              />
            </div>
          ))}

          <Button
            variant="secondary"
            className="h-12 w-full gap-2"
            onClick={() => setLignes((p) => [...p, LIGNE_VIDE])}
          >
            <Plus className="size-4" />
            Ajouter une ligne
          </Button>
          <Button className="h-14 w-full text-base font-semibold" onClick={enregistrer}>
            Enregistrer la liste
          </Button>
        </div>
      )}

      <section>
        <h2 className="mb-2 font-display text-xl uppercase tracking-wide">Listes enregistrées</h2>
        <ul className="space-y-2">
          {listes.map((l) => (
            <li key={l.id} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <p className="font-semibold">{l.client}</p>
              <p className="text-xs text-muted-foreground">
                {l.lignes.length} référence(s) attendue(s)
              </p>
            </li>
          ))}
          {listes.length === 0 && (
            <li className="text-sm text-muted-foreground">Aucune liste d'attendus.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

/* ------------------------- Onglet 2 : Réception ------------------------- */

function SectionReception({
  listes,
  setListes,
}: {
  listes: ListeAttendus[];
  setListes: (l: ListeAttendus[]) => void;
}) {
  const [client, setClient] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ listeId: string; ligne: LigneAttendu } | null>(null);
  const [quantite, setQuantite] = useState("");
  const [etiquette, setEtiquette] = useState<string | null>(null);

  const clients = [...new Set(listes.map((l) => l.client))];
  const listesClient = listes.filter((l) => l.client === client);

  if (!client) {
    return (
      <div>
        <h2 className="mb-2 font-display text-xl uppercase tracking-wide">Clients à réceptionner</h2>
        <ul className="space-y-2">
          {clients.map((c) => (
            <li key={c}>
              <button
                type="button"
                onClick={() => setClient(c)}
                className="w-full rounded-lg border border-border bg-card px-3 py-3 text-left font-semibold"
              >
                {c}
              </button>
            </li>
          ))}
          {clients.length === 0 && (
            <li className="text-sm text-muted-foreground">
              Aucun attendu en cours. Créez une liste dans l'onglet « Attendus ».
            </li>
          )}
        </ul>
      </div>
    );
  }

  if (selection) {
    const { listeId, ligne } = selection;
    return (
      <div className="space-y-4">
        <Button variant="ghost" className="gap-2 px-0" onClick={() => setSelection(null)}>
          <ChevronLeft className="size-4" />
          Retour
        </Button>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="font-display text-2xl leading-none">{ligne.reference}</p>
          <p className="text-sm text-muted-foreground">{ligne.designation}</p>
          <p className="mt-2 text-sm">
            Attendu : {ligne.quantiteAttendue} · Déjà reçu : {ligne.quantiteRecue}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantite-recue">Quantité réellement reçue</Label>
          <Input
            id="quantite-recue"
            type="number"
            min={0}
            inputMode="numeric"
            value={quantite}
            onChange={(e) => setQuantite(e.target.value)}
            className="h-14 text-base"
          />
        </div>

        <Button
          className="h-14 w-full text-base font-semibold"
          onClick={() => {
            const valeur = Number(quantite);
            if (!Number.isFinite(valeur) || valeur <= 0) {
              toast.error("Saisissez une quantité reçue valide.");
              return;
            }
            const misesAJour = enregistrerReception(listeId, ligne.id, valeur);
            setListes(misesAJour);
            const majLigne = misesAJour
              .find((l) => l.id === listeId)
              ?.lignes.find((x) => x.id === ligne.id);
            if (majLigne) setSelection({ listeId, ligne: majLigne });
            setQuantite("");
            toast.success(`${valeur} unité(s) entrée(s) en stock.`);
          }}
        >
          Valider la réception
        </Button>

        {ligne.quantiteRecue > 0 && (
          <>
            <div className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm">
              Statut : {LIBELLE_STATUT[statutLigne(ligne)]} · Reliquat {reliquat(ligne)} · Écart{" "}
              {ecart(ligne) > 0 ? `+${ecart(ligne)}` : ecart(ligne)}
            </div>
            <Button
              variant="secondary"
              className="h-14 w-full gap-2 text-base font-semibold"
              onClick={() => setEtiquette(ligne.reference)}
            >
              <QrCode className="size-5" />
              Imprimer le QR code
            </Button>
          </>
        )}

        <DialogEtiquette
          open={etiquette !== null}
          valeurs={etiquette ? [etiquette] : []}
          titre={`Étiquette ${etiquette ?? ""}`}
          onClose={() => setEtiquette(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button variant="ghost" className="gap-2 px-0" onClick={() => setClient(null)}>
        <ChevronLeft className="size-4" />
        Clients
      </Button>
      <h2 className="font-display text-xl uppercase tracking-wide">{client}</h2>
      <ul className="space-y-2">
        {listesClient.flatMap((liste) =>
          liste.lignes.map((ligne) => (
            <li key={ligne.id}>
              <button
                type="button"
                onClick={() => setSelection({ listeId: liste.id, ligne })}
                className="w-full rounded-lg border border-border bg-card px-3 py-3 text-left"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <span className="truncate font-semibold">{ligne.reference}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {LIBELLE_STATUT[statutLigne(ligne)]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{ligne.designation}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Attendu {ligne.quantiteAttendue} · Reçu {ligne.quantiteRecue} · Reliquat{" "}
                  {reliquat(ligne)}
                </p>
              </button>
            </li>
          )),
        )}
      </ul>
    </div>
  );
}

/* ------------------------- Onglet 3 : Reliquats ------------------------- */

function SectionReliquats({ listes }: { listes: ListeAttendus[] }) {
  const clients = [...new Set(listes.map((l) => l.client))];

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Vue administrateur : reliquats et écarts de réception, par client puis par référence.
      </p>

      {clients.map((c) => (
        <section key={c}>
          <h2 className="mb-2 font-display text-xl uppercase tracking-wide">{c}</h2>
          <ul className="space-y-2">
            {listes
              .filter((l) => l.client === c)
              .flatMap((l) => l.lignes)
              .map((ligne) => (
                <li
                  key={ligne.id}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <span className="truncate font-semibold">{ligne.reference}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {LIBELLE_STATUT[statutLigne(ligne)]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{ligne.designation}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Attendu {ligne.quantiteAttendue} · Reçu {ligne.quantiteRecue} · Reliquat{" "}
                    {reliquat(ligne)} · Écart {ecart(ligne) > 0 ? `+${ecart(ligne)}` : ecart(ligne)}
                  </p>
                </li>
              ))}
          </ul>
        </section>
      ))}

      {clients.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun attendu enregistré.</p>
      )}
    </div>
  );
}
