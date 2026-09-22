/**
 * Données de démonstration des réceptions (attendus / reçus).
 * Stockage local uniquement : aucune donnée métier en base.
 */

export type LigneAttendu = {
  id: string;
  reference: string;
  designation: string;
  quantiteAttendue: number;
  quantiteRecue: number;
};

export type ListeAttendus = {
  id: string;
  client: string;
  creeLe: string;
  lignes: LigneAttendu[];
};

const CLE = "swms.receptions";

function estNavigateur() {
  return typeof window !== "undefined";
}

export function chargerListes(): ListeAttendus[] {
  if (!estNavigateur()) return [];
  try {
    const brut = window.localStorage.getItem(CLE);
    return brut ? (JSON.parse(brut) as ListeAttendus[]) : [];
  } catch {
    return [];
  }
}

export function enregistrerListes(listes: ListeAttendus[]) {
  if (!estNavigateur()) return;
  window.localStorage.setItem(CLE, JSON.stringify(listes));
}

export function ajouterListe(liste: Omit<ListeAttendus, "id" | "creeLe">): ListeAttendus[] {
  const nouvelle: ListeAttendus = {
    ...liste,
    id: crypto.randomUUID(),
    creeLe: new Date().toISOString(),
  };
  const listes = [...chargerListes(), nouvelle];
  enregistrerListes(listes);
  return listes;
}

/** Enregistre une quantité reçue supplémentaire sur une ligne d'attendu. */
export function enregistrerReception(
  listeId: string,
  ligneId: string,
  quantite: number,
): ListeAttendus[] {
  const listes = chargerListes().map((l) =>
    l.id !== listeId
      ? l
      : {
          ...l,
          lignes: l.lignes.map((ligne) =>
            ligne.id !== ligneId
              ? ligne
              : { ...ligne, quantiteRecue: ligne.quantiteRecue + quantite },
          ),
        },
  );
  enregistrerListes(listes);
  return listes;
}

export type StatutLigne = "attente" | "partielle" | "complete" | "surplus";

export function statutLigne(ligne: LigneAttendu): StatutLigne {
  if (ligne.quantiteRecue === 0) return "attente";
  if (ligne.quantiteRecue < ligne.quantiteAttendue) return "partielle";
  if (ligne.quantiteRecue > ligne.quantiteAttendue) return "surplus";
  return "complete";
}

export const LIBELLE_STATUT: Record<StatutLigne, string> = {
  attente: "En attente",
  partielle: "Réception partielle",
  complete: "Réception complète",
  surplus: "Sur-réception",
};

export function reliquat(ligne: LigneAttendu) {
  return Math.max(0, ligne.quantiteAttendue - ligne.quantiteRecue);
}

export function ecart(ligne: LigneAttendu) {
  return ligne.quantiteRecue - ligne.quantiteAttendue;
}
