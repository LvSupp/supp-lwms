import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, MapPin, Hash, Pencil, Power } from "lucide-react";
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
import { chargerSites } from "@/lib/stock";
import {
  apercuNumero,
  basculerArticle,
  basculerEmplacement,
  chargerNumerotation,
  chargerTousArticles,
  chargerTousEmplacements,
  compteurDepuisNumero,
  creerArticle,
  creerEmplacement,
  enregistrerNumerotation,
  modifierArticle,
  modifierEmplacement,
  prochainNumero,
} from "@/lib/parametres";

export const Route = createFileRoute("/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres — Stock Palettes" },
      {
        name: "description",
        content:
          "Gérez les articles, les emplacements et la numérotation des palettes de votre entrepôt.",
      },
      { property: "og:title", content: "Paramètres — Stock Palettes" },
      {
        property: "og:description",
        content: "Articles, emplacements et numérotation des palettes : réglages de l'entrepôt.",
      },
    ],
  }),
  component: PageParametres,
});

type Onglet = "articles" | "emplacements" | "numerotation";

function PageParametres() {
  const [onglet, setOnglet] = useState<Onglet>("articles");

  return (
    <AppShell titre="Paramètres">
      <div className="mb-5 grid grid-cols-3 gap-2">
        <OngletBouton actif={onglet === "articles"} onClick={() => setOnglet("articles")} icone={<Package className="size-4" />} label="Articles" />
        <OngletBouton actif={onglet === "emplacements"} onClick={() => setOnglet("emplacements")} icone={<MapPin className="size-4" />} label="Emplac." />
        <OngletBouton actif={onglet === "numerotation"} onClick={() => setOnglet("numerotation")} icone={<Hash className="size-4" />} label="Numéros" />
      </div>

      {onglet === "articles" && <SectionArticles />}
      {onglet === "emplacements" && <SectionEmplacements />}
      {onglet === "numerotation" && <SectionNumerotation />}
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

/* ------------------------- Articles ------------------------- */

function SectionArticles() {
  const queryClient = useQueryClient();
  const articles = useQuery({ queryKey: ["parametres", "articles"], queryFn: chargerTousArticles });

  const [edition, setEdition] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [designation, setDesignation] = useState("");
  const [ean, setEan] = useState("");
  const [enCours, setEnCours] = useState(false);

  const reinitialiser = () => {
    setEdition(null);
    setReference("");
    setDesignation("");
    setEan("");
  };

  const rafraichir = () => {
    void queryClient.invalidateQueries({ queryKey: ["parametres", "articles"] });
    void queryClient.invalidateQueries({ queryKey: ["articles"] });
  };

  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference.trim() || !designation.trim()) {
      toast.error("Renseignez la référence et la désignation.");
      return;
    }
    setEnCours(true);
    try {
      if (edition) {
        await modifierArticle(edition, { reference, designation, ean });
        toast.success("Article modifié.");
      } else {
        await creerArticle({ reference, designation, ean });
        toast.success("Article créé.");
      }
      reinitialiser();
      rafraichir();
    } catch (error) {
      toast.error(messageErreur(error, "ean"));
    } finally {
      setEnCours(false);
    }
  };

  const basculer = async (id: string, actif: boolean) => {
    try {
      await basculerArticle(id, actif);
      toast.success(actif ? "Article réactivé." : "Article désactivé.");
      rafraichir();
    } catch (error) {
      toast.error(messageErreur(error, "ean"));
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={enregistrer} className="space-y-4 rounded-xl border border-border bg-card p-4">
        <p className="font-display text-xl uppercase tracking-wide">
          {edition ? "Modifier l'article" : "Nouvel article"}
        </p>
        <div className="space-y-2">
          <Label htmlFor="reference">Référence</Label>
          <Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} className="h-14 text-base" placeholder="ART-1005" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="designation">Désignation</Label>
          <Input id="designation" value={designation} onChange={(e) => setDesignation(e.target.value)} className="h-14 text-base" placeholder="Carton 40x30" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ean">Code EAN</Label>
          <Input id="ean" value={ean} onChange={(e) => setEan(e.target.value)} inputMode="numeric" className="h-14 text-base" placeholder="3401579800125" />
          <p className="text-xs text-muted-foreground">Unique. Sert au scan lors de la création d'une palette.</p>
        </div>
        <div className="grid gap-2">
          <Button type="submit" disabled={enCours} className="h-14 w-full text-base font-semibold">
            {edition ? "Enregistrer" : "Créer l'article"}
          </Button>
          {edition && (
            <Button type="button" variant="secondary" className="h-12 w-full" onClick={reinitialiser}>
              Annuler la modification
            </Button>
          )}
        </div>
      </form>

      <ul className="space-y-2">
        {(articles.data ?? []).map((a) => (
          <li key={a.id} className="rounded-lg border border-border bg-card p-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">{a.reference}</p>
                <p className="truncate text-sm text-muted-foreground">{a.designation}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  EAN : {a.ean ?? "—"}
                  {!a.actif && " · désactivé"}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Modifier l'article"
                  onClick={() => {
                    setEdition(a.id);
                    setReference(a.reference);
                    setDesignation(a.designation);
                    setEan(a.ean ?? "");
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={a.actif ? "Désactiver l'article" : "Réactiver l'article"}
                  onClick={() => void basculer(a.id, !a.actif)}
                >
                  {a.actif ? <Power className="size-4 text-success" /> : <Power className="size-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>
          </li>
        ))}
        {articles.data?.length === 0 && (
          <li className="text-sm text-muted-foreground">Aucun article enregistré.</li>
        )}
      </ul>
    </div>
  );
}

/* ------------------------- Emplacements ------------------------- */

function SectionEmplacements() {
  const queryClient = useQueryClient();
  const emplacements = useQuery({
    queryKey: ["parametres", "emplacements"],
    queryFn: chargerTousEmplacements,
  });
  const sites = useQuery({ queryKey: ["sites"], queryFn: chargerSites });

  const [edition, setEdition] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [siteId, setSiteId] = useState("");
  const [enCours, setEnCours] = useState(false);

  const reinitialiser = () => {
    setEdition(null);
    setCode("");
    setSiteId("");
  };

  const rafraichir = () => {
    void queryClient.invalidateQueries({ queryKey: ["parametres", "emplacements"] });
    void queryClient.invalidateQueries({ queryKey: ["emplacements"] });
  };

  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !siteId) {
      toast.error("Renseignez le code et le site.");
      return;
    }
    setEnCours(true);
    try {
      if (edition) {
        await modifierEmplacement(edition, { code, site_id: siteId });
        toast.success("Emplacement modifié.");
      } else {
        await creerEmplacement({ code, site_id: siteId });
        toast.success("Emplacement créé.");
      }
      reinitialiser();
      rafraichir();
    } catch (error) {
      toast.error(messageErreur(error, "code"));
    } finally {
      setEnCours(false);
    }
  };

  const basculer = async (id: string, actif: boolean) => {
    try {
      await basculerEmplacement(id, actif);
      toast.success(actif ? "Emplacement réactivé." : "Emplacement désactivé.");
      rafraichir();
    } catch (error) {
      toast.error(messageErreur(error, "code"));
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={enregistrer} className="space-y-4 rounded-xl border border-border bg-card p-4">
        <p className="font-display text-xl uppercase tracking-wide">
          {edition ? "Modifier l'emplacement" : "Nouvel emplacement"}
        </p>
        <div className="space-y-2">
          <Label htmlFor="code">Code emplacement</Label>
          <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} className="h-14 text-base" placeholder="A-01-03" />
        </div>
        <div className="space-y-2">
          <Label>Site</Label>
          <Select value={siteId} onValueChange={setSiteId}>
            <SelectTrigger className="h-14 w-full text-base">
              <SelectValue placeholder="Choisir un site" />
            </SelectTrigger>
            <SelectContent>
              {(sites.data ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Button type="submit" disabled={enCours} className="h-14 w-full text-base font-semibold">
            {edition ? "Enregistrer" : "Créer l'emplacement"}
          </Button>
          {edition && (
            <Button type="button" variant="secondary" className="h-12 w-full" onClick={reinitialiser}>
              Annuler la modification
            </Button>
          )}
        </div>
      </form>

      <ul className="space-y-2">
        {(emplacements.data ?? []).map((e) => (
          <li key={e.id} className="rounded-lg border border-border bg-card p-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">{e.code}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {e.sites?.nom ?? "—"}
                  {!e.actif && " · désactivé"}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Modifier l'emplacement"
                  onClick={() => {
                    setEdition(e.id);
                    setCode(e.code);
                    setSiteId(e.site_id);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={e.actif ? "Désactiver l'emplacement" : "Réactiver l'emplacement"}
                  onClick={() => void basculer(e.id, !e.actif)}
                >
                  {e.actif ? <Power className="size-4 text-success" /> : <Power className="size-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>
          </li>
        ))}
        {emplacements.data?.length === 0 && (
          <li className="text-sm text-muted-foreground">Aucun emplacement enregistré.</li>
        )}
      </ul>
    </div>
  );
}

/* ------------------------- Numérotation ------------------------- */

function SectionNumerotation() {
  const queryClient = useQueryClient();
  const reglages = useQuery({ queryKey: ["numerotation"], queryFn: chargerNumerotation });
  const suivant = useQuery({ queryKey: ["numerotation", "suivant"], queryFn: prochainNumero });

  const [prefixe, setPrefixe] = useState("");
  const [longueur, setLongueur] = useState("6");
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    if (reglages.data) {
      setPrefixe(reglages.data.prefixe);
      setLongueur(String(reglages.data.longueur));
    }
  }, [reglages.data]);

  const compteur = compteurDepuisNumero(suivant.data ?? null);
  const apercu = apercuNumero(prefixe, Number(longueur), compteur);

  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault();
    const taille = Number(longueur);
    if (!Number.isInteger(taille) || taille < 1 || taille > 12) {
      toast.error("La longueur doit être un nombre entre 1 et 12.");
      return;
    }
    setEnCours(true);
    try {
      await enregistrerNumerotation({ prefixe, longueur: taille });
      toast.success("Numérotation enregistrée.");
      void queryClient.invalidateQueries({ queryKey: ["numerotation"] });
    } catch (error) {
      toast.error(messageErreur(error, "numérotation"));
    } finally {
      setEnCours(false);
    }
  };

  return (
    <form onSubmit={enregistrer} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="prefixe">Préfixe palette</Label>
        <Input id="prefixe" value={prefixe} onChange={(e) => setPrefixe(e.target.value)} className="h-14 text-base" placeholder="PAL-" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="longueur">Longueur du compteur</Label>
        <Input
          id="longueur"
          type="number"
          min={1}
          max={12}
          inputMode="numeric"
          value={longueur}
          onChange={(e) => setLongueur(e.target.value)}
          className="h-14 text-base"
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Prévisualisation du prochain numéro
        </p>
        <p className="mt-1 font-display text-3xl leading-none">{apercu}</p>
      </div>

      <Button type="submit" disabled={enCours} className="h-14 w-full text-base font-semibold">
        Enregistrer la numérotation
      </Button>
    </form>
  );
}

function messageErreur(error: unknown, champ: string) {
  const message = error instanceof Error ? error.message : "Opération impossible.";
  if (message.toLowerCase().includes("duplicate")) return `Ce ${champ} existe déjà.`;
  return message;
}
