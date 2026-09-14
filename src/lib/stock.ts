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
  const { data, error } = await supabase.from("articles").select("id, reference, designation").order("reference");
  if (error) throw error;
  return (data ?? []) as Article[];
}

export async function chargerEmplacements() {
  const { data, error } = await supabase
    .from("emplacements")
    .select("id, code, site_id, sites(nom)")
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

export function formaterDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
