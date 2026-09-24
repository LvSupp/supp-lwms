import { supabase } from "@/integrations/supabase/client";

export type Emplacement = {
  id: string;
  code: string;
  site_id: string;
  capacite_max: number | null;
  type_emplacement: string;
  sites?: { nom: string } | null;
};

const EMPLACEMENT_SELECT = "id, code, site_id, capacite_max, type_emplacement, sites(nom)";
export type Article = { id: string; reference: string; designation: string };

/** Une ligne de contenu : une référence article présente sur une palette. */
export type Contenu = {
  id: string;
  article_id: string;
  quantite: number;
  statut: string;
  articles: { reference: string; designation: string } | null;
};

/** Palette multi-références avec sa localisation et son contenu. */
export type PaletteLigne = {
  id: string;
  numero: string;
  statut: string;
  created_at: string;
  emplacement_id: string | null;
  emplacements: {
    id: string;
    code: string;
    type_emplacement: string;
    sites: { nom: string } | null;
  } | null;
  palette_contenus: Contenu[];
};

export type PaletteDetail = PaletteLigne;

export type Mouvement = {
  id: string;
  created_at: string;
  type: string;
  utilisateur_nom: string | null;
  palettes: { numero: string } | null;
  source: { code: string } | null;
  destination: { code: string } | null;
};

const PALETTE_SELECT =
  "id, numero, statut, created_at, emplacement_id, emplacements(id, code, type_emplacement, sites(nom)), palette_contenus(id, article_id, quantite, statut, articles(reference, designation))";

export const quantiteTotale = (p: PaletteLigne) =>
  p.palette_contenus.reduce((s, c) => s + c.quantite, 0);

export const libelleZone = (e: PaletteLigne["emplacements"]) =>
  !e ? "Non affectée" : e.type_emplacement === "RECEPTION" ? "Réception" : "Stock";

export async function chargerArticles() {
  const { data, error } = await supabase
    .from("articles")
    .select("id, reference, designation")
    .eq("actif", true)
    .order("reference");
  if (error) throw error;
  return (data ?? []) as Article[];
}

export async function chargerEmplacements() {
  const { data, error } = await supabase
    .from("emplacements")
    .select(EMPLACEMENT_SELECT)
    .eq("actif", true)
    .order("code");
  if (error) throw error;
  return (data ?? []) as Emplacement[];
}

export async function chargerSites() {
  const { data, error } = await supabase.from("sites").select("id, nom").order("nom");
  if (error) throw error;
  return (data ?? []) as { id: string; nom: string }[];
}

/** Recherche une palette par son code (issu du scan ou d'une saisie manuelle). */
export async function trouverPalette(numero: string) {
  const valeur = numero.trim();
  if (!valeur) return null;
  const { data, error } = await supabase
    .from("palettes")
    .select(PALETTE_SELECT)
    .ilike("numero", valeur)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as PaletteLigne | null) ?? null;
}

export async function trouverEmplacement(code: string) {
  const valeur = code.trim();
  if (!valeur) return null;
  const { data, error } = await supabase
    .from("emplacements")
    .select(EMPLACEMENT_SELECT)
    .ilike("code", valeur)
    .maybeSingle();
  if (error) throw error;
  return (data as Emplacement | null) ?? null;
}

/**
 * Crée une palette multi-références en une seule transaction :
 * palette + contenus + affectation en Réception + mouvement d'entrée.
 * Code vide = numéro généré automatiquement.
 */
export async function creerPaletteMulti(params: {
  numero: string;
  lignes: { article_id: string; quantite: number }[];
}) {
  const { data, error } = await supabase.rpc("creer_palette_multi", {
    p_numero: params.numero,
    p_lignes: params.lignes,
  });
  if (error) throw error;
  return data as { id: string; numero: string };
}

/** Emplacement de Réception actif, identifié par son type (jamais par son libellé). */
export async function chargerReception() {
  const { data, error } = await supabase
    .from("emplacements")
    .select(EMPLACEMENT_SELECT)
    .eq("type_emplacement", "RECEPTION")
    .eq("actif", true)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Emplacement | null) ?? null;
}

/** Libellé d'occupation d'un emplacement : « 1 / 1 palette » ou « 12 palettes ». */
export function libelleOccupation(capacite_max: number | null, occupation: number) {
  const pluriel = occupation > 1 ? "s" : "";
  if (capacite_max === null) return `${occupation} palette${pluriel}`;
  return `${occupation} / ${capacite_max} palette${capacite_max > 1 ? "s" : ""}`;
}

export function etatOccupation(capacite_max: number | null, occupation: number) {
  if (capacite_max === null) return "Capacité illimitée" as const;
  return occupation >= capacite_max ? ("Complet" as const) : ("Disponible" as const);
}

export async function deplacerPalette(palette_id: string, destination_id: string) {
  const { data, error } = await supabase.rpc("deplacer_palette", {
    p_palette_id: palette_id,
    p_destination_id: destination_id,
  });
  if (error) throw error;
  return data as { id: string; numero: string };
}

export async function chargerMouvements(limite = 200) {
  const { data, error } = await supabase
    .from("mouvements")
    .select(
      "id, created_at, type, utilisateur_nom, palettes(numero), source:source_id(code), destination:destination_id(code)",
    )
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) throw error;
  return (data ?? []) as unknown as Mouvement[];
}

export async function chargerStats() {
  const debutJour = new Date();
  debutJour.setHours(0, 0, 0, 0);

  const [palettes, emplacements, mouvements] = await Promise.all([
    supabase.from("palettes").select("id", { count: "exact", head: true }),
    supabase.from("emplacements").select("id", { count: "exact", head: true }),
    supabase
      .from("mouvements")
      .select("id", { count: "exact", head: true })
      .gte("created_at", debutJour.toISOString()),
  ]);

  return {
    palettes: palettes.count ?? 0,
    emplacements: emplacements.count ?? 0,
    mouvementsDuJour: mouvements.count ?? 0,
  };
}

/* ---------------- Vue stock ---------------- */

export type LigneStock = {
  article_id: string;
  reference: string;
  designation: string;
  quantite_totale: number;
  nb_palettes: number;
};

/** Toutes les palettes avec leur contenu (volumétrie de démonstration). */
export async function chargerToutesPalettes() {
  const { data, error } = await supabase.from("palettes").select(PALETTE_SELECT).order("numero");
  if (error) throw error;
  return (data ?? []) as unknown as PaletteLigne[];
}

/** Stock agrégé par article : somme des quantités des contenus et nombre de palettes. */
export async function chargerStockParArticle(): Promise<LigneStock[]> {
  const palettes = await chargerToutesPalettes();
  const parArticle = new Map<string, LigneStock>();
  for (const p of palettes) {
    for (const c of p.palette_contenus) {
      const courant = parArticle.get(c.article_id) ?? {
        article_id: c.article_id,
        reference: c.articles?.reference ?? "—",
        designation: c.articles?.designation ?? "",
        quantite_totale: 0,
        nb_palettes: 0,
      };
      courant.quantite_totale += c.quantite;
      courant.nb_palettes += 1;
      parArticle.set(c.article_id, courant);
    }
  }
  return [...parArticle.values()].sort((a, b) => a.reference.localeCompare(b.reference));
}

export async function chargerPalettesArticle(article_id: string) {
  const palettes = await chargerToutesPalettes();
  return palettes.filter((p) => p.palette_contenus.some((c) => c.article_id === article_id));
}

export async function chargerPalettesEmplacement(emplacement_id: string) {
  const { data, error } = await supabase
    .from("palettes")
    .select(PALETTE_SELECT)
    .eq("emplacement_id", emplacement_id)
    .order("numero");
  if (error) throw error;
  return (data ?? []) as unknown as PaletteLigne[];
}

export async function chargerArticle(id: string) {
  const { data, error } = await supabase
    .from("articles")
    .select("id, reference, designation")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Article | null) ?? null;
}

export async function chargerEmplacement(id: string) {
  const { data, error } = await supabase
    .from("emplacements")
    .select(EMPLACEMENT_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Emplacement | null) ?? null;
}

export async function chargerPalette(id: string) {
  const { data, error } = await supabase
    .from("palettes")
    .select(PALETTE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as PaletteLigne | null) ?? null;
}

export async function chargerMouvementsPalette(palette_id: string) {
  const { data, error } = await supabase
    .from("mouvements")
    .select(
      "id, created_at, type, utilisateur_nom, palettes(numero), source:source_id(code), destination:destination_id(code)",
    )
    .eq("palette_id", palette_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Mouvement[];
}

export type ResultatsRecherche = {
  articles: LigneStock[];
  palettes: PaletteLigne[];
  emplacements: Emplacement[];
};

/** Recherche libre : code palette, référence, désignation ou emplacement. */
export async function rechercheGlobale(terme: string): Promise<ResultatsRecherche> {
  const q = terme.trim();
  if (!q) return { articles: [], palettes: [], emplacements: [] };
  const bas = q.toLowerCase();
  const contient = (v?: string | null) => (v ?? "").toLowerCase().includes(bas);

  const [stock, palettes, emplacements] = await Promise.all([
    chargerStockParArticle(),
    chargerToutesPalettes(),
    supabase.from("emplacements").select(EMPLACEMENT_SELECT).ilike("code", `%${q}%`).order("code"),
  ]);
  if (emplacements.error) throw emplacements.error;

  return {
    articles: stock.filter((a) => contient(a.reference) || contient(a.designation)),
    palettes: palettes.filter(
      (p) =>
        contient(p.numero) ||
        contient(p.emplacements?.code) ||
        p.palette_contenus.some(
          (c) => contient(c.articles?.reference) || contient(c.articles?.designation),
        ),
    ),
    emplacements: (emplacements.data ?? []) as Emplacement[],
  };
}

export function formaterDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
