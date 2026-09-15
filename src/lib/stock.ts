import { supabase } from "@/integrations/supabase/client";

export type Emplacement = { id: string; code: string; site_id: string; sites?: { nom: string } | null };
export type Article = { id: string; reference: string; designation: string };

export type PaletteDetail = {
  id: string;
  numero: string;
  quantite: number;
  lot: string | null;
  statut: string;
  created_at: string;
  articles: { reference: string; designation: string } | null;
  emplacements: { code: string; sites: { nom: string } | null } | null;
};

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
  "id, numero, quantite, lot, statut, created_at, articles(reference, designation), emplacements(code, sites(nom))";

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
    .select("id, code, site_id, sites(nom)")
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

/** Recherche une palette par son numéro (issu du scan ou d'une saisie manuelle). */
export async function trouverPalette(numero: string) {
  const valeur = numero.trim();
  if (!valeur) return null;
  const { data, error } = await supabase
    .from("palettes")
    .select(PALETTE_SELECT)
    .ilike("numero", valeur)
    .maybeSingle();
  if (error) throw error;
  return (data as PaletteDetail | null) ?? null;
}

export async function trouverEmplacement(code: string) {
  const valeur = code.trim();
  if (!valeur) return null;
  const { data, error } = await supabase
    .from("emplacements")
    .select("id, code, site_id, sites(nom)")
    .ilike("code", valeur)
    .maybeSingle();
  if (error) throw error;
  return (data as Emplacement | null) ?? null;
}

export async function creerPalette(params: {
  article_id: string;
  quantite: number;
  lot: string;
  emplacement_id: string;
}) {
  const { data, error } = await supabase.rpc("creer_palette", {
    p_article_id: params.article_id,
    p_quantite: params.quantite,
    p_lot: params.lot,
    p_emplacement_id: params.emplacement_id,
  });
  if (error) throw error;
  return data as { id: string; numero: string };
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

export type PaletteLigne = {
  id: string;
  numero: string;
  quantite: number;
  lot: string | null;
  article_id: string;
  emplacement_id: string | null;
  articles: { reference: string; designation: string } | null;
  emplacements: { id: string; code: string } | null;
};

const LIGNE_SELECT =
  "id, numero, quantite, lot, article_id, emplacement_id, articles(reference, designation), emplacements(id, code)";

async function chargerPalettesLignes(filtre?: (q: any) => any) {
  let requete = supabase.from("palettes").select(LIGNE_SELECT).order("numero");
  if (filtre) requete = filtre(requete);
  const { data, error } = await requete;
  if (error) throw error;
  return (data ?? []) as unknown as PaletteLigne[];
}

/** Stock agrégé par article : somme des quantités des palettes et nombre de palettes. */
export async function chargerStockParArticle(): Promise<LigneStock[]> {
  const lignes = await chargerPalettesLignes();
  const parArticle = new Map<string, LigneStock>();
  for (const l of lignes) {
    const courant =
      parArticle.get(l.article_id) ??
      {
        article_id: l.article_id,
        reference: l.articles?.reference ?? "—",
        designation: l.articles?.designation ?? "",
        quantite_totale: 0,
        nb_palettes: 0,
      };
    courant.quantite_totale += l.quantite;
    courant.nb_palettes += 1;
    parArticle.set(l.article_id, courant);
  }
  return [...parArticle.values()].sort((a, b) => a.reference.localeCompare(b.reference));
}

export async function chargerPalettesArticle(article_id: string) {
  return chargerPalettesLignes((q) => q.eq("article_id", article_id));
}

export async function chargerPalettesEmplacement(emplacement_id: string) {
  return chargerPalettesLignes((q) => q.eq("emplacement_id", emplacement_id));
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
    .select("id, code, site_id, sites(nom)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Emplacement | null) ?? null;
}

export async function chargerPalette(id: string) {
  const { data, error } = await supabase
    .from("palettes")
    .select("id, numero, quantite, lot, statut, created_at, emplacement_id, article_id, articles(reference, designation), emplacements(id, code, sites(nom))")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as (PaletteDetail & { emplacement_id: string | null; article_id: string }) | null) ?? null;
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

/** Recherche libre : article, référence, numéro de palette ou code emplacement. */
export async function rechercheGlobale(terme: string): Promise<ResultatsRecherche> {
  const q = terme.trim();
  if (!q) return { articles: [], palettes: [], emplacements: [] };
  const motif = `%${q}%`;

  const [stock, palettes, emplacements] = await Promise.all([
    chargerStockParArticle(),
    chargerPalettesLignes((r) => r.ilike("numero", motif)),
    supabase.from("emplacements").select("id, code, site_id, sites(nom)").ilike("code", motif).order("code"),
  ]);
  if (emplacements.error) throw emplacements.error;

  const bas = q.toLowerCase();
  return {
    articles: stock.filter(
      (a) =>
        a.reference.toLowerCase().includes(bas) || a.designation.toLowerCase().includes(bas),
    ),
    palettes,
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
