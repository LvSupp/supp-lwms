/**
 * Préférences locales d'affichage (aucune donnée métier).
 * Stockées dans le navigateur de l'utilisateur.
 */
export type TypeEtiquette = "palette" | "emplacement";

const CLE: Record<TypeEtiquette, string> = {
  palette: "swms.demander-etiquette-palette",
  emplacement: "swms.demander-etiquette-emplacement",
};

export function demanderEtiquette(type: TypeEtiquette) {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(CLE[type]) !== "non";
}

export function definirDemandeEtiquette(type: TypeEtiquette, demander: boolean) {
  if (typeof window === "undefined") return;
  if (demander) window.localStorage.removeItem(CLE[type]);
  else window.localStorage.setItem(CLE[type], "non");
}
