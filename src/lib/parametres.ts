import { supabase } from "@/integrations/supabase/client";

export type ArticleParam = {
  id: string;
  reference: string;
  designation: string;
  ean: string | null;
  actif: boolean;
};

export type EmplacementParam = {
  id: string;
  code: string;
  site_id: string;
  actif: boolean;
  sites?: { nom: string } | null;
};

export type Numerotation = { prefixe: string; longueur: number };

/* ---------------- Articles ---------------- */

export async function chargerTousArticles() {
  const { data, error } = await supabase
    .from("articles")
    .select("id, reference, designation, ean, actif")
    .order("reference");
  if (error) throw error;
  return (data ?? []) as ArticleParam[];
}

export async function creerArticle(params: {
  reference: string;
  designation: string;
  ean: string;
}) {
  const { error } = await supabase.from("articles").insert({
    reference: params.reference.trim(),
    designation: params.designation.trim(),
    ean: params.ean.trim() || null,
  });
  if (error) throw error;
}

export async function modifierArticle(
  id: string,
  params: { reference: string; designation: string; ean: string },
) {
  const { error } = await supabase
    .from("articles")
    .update({
      reference: params.reference.trim(),
      designation: params.designation.trim(),
      ean: params.ean.trim() || null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function basculerArticle(id: string, actif: boolean) {
  const { error } = await supabase.from("articles").update({ actif }).eq("id", id);
  if (error) throw error;
}

/** Recherche un article par son code EAN (scan ou saisie). */
export async function trouverArticleParEan(ean: string) {
  const valeur = ean.trim();
  if (!valeur) return null;
  const { data, error } = await supabase
    .from("articles")
    .select("id, reference, designation, ean, actif")
    .eq("ean", valeur)
    .eq("actif", true)
    .maybeSingle();
  if (error) throw error;
  return (data as ArticleParam | null) ?? null;
}

/* ---------------- Emplacements ---------------- */

export async function chargerTousEmplacements() {
  const { data, error } = await supabase
    .from("emplacements")
    .select("id, code, site_id, actif, sites(nom)")
    .order("code");
  if (error) throw error;
  return (data ?? []) as EmplacementParam[];
}

export async function creerEmplacement(params: { code: string; site_id: string }) {
  const { error } = await supabase
    .from("emplacements")
    .insert({ code: params.code.trim(), site_id: params.site_id });
  if (error) throw error;
}

export async function modifierEmplacement(
  id: string,
  params: { code: string; site_id: string },
) {
  const { error } = await supabase
    .from("emplacements")
    .update({ code: params.code.trim(), site_id: params.site_id })
    .eq("id", id);
  if (error) throw error;
}

export async function basculerEmplacement(id: string, actif: boolean) {
  const { error } = await supabase.from("emplacements").update({ actif }).eq("id", id);
  if (error) throw error;
}

/* ---------------- Numérotation ---------------- */

export async function chargerNumerotation() {
  const { data, error } = await supabase
    .from("parametres_numerotation")
    .select("prefixe, longueur")
    .maybeSingle();
  if (error) throw error;
  return (data as Numerotation | null) ?? { prefixe: "PAL-", longueur: 6 };
}

export async function enregistrerNumerotation(params: Numerotation) {
  const { error } = await supabase
    .from("parametres_numerotation")
    .update({ prefixe: params.prefixe, longueur: params.longueur })
    .eq("id", true);
  if (error) throw error;
}

/** Prochain numéro tel que la base le générerait avec les réglages enregistrés. */
export async function prochainNumero() {
  const { data, error } = await supabase.rpc("prochain_numero_palette");
  if (error) throw error;
  return (data as string | null) ?? null;
}

/** Prévisualisation locale, pour refléter les valeurs en cours de saisie. */
export function apercuNumero(prefixe: string, longueur: number, compteur: number) {
  const taille = Math.min(Math.max(Math.trunc(longueur) || 1, 1), 12);
  return `${prefixe}${String(compteur).padStart(taille, "0")}`;
}

/** Extrait la valeur du compteur d'un numéro déjà formaté. */
export function compteurDepuisNumero(numero: string | null) {
  const chiffres = numero?.match(/(\d+)\s*$/);
  return chiffres ? Number(chiffres[1]) : 1;
}
