import type { PaletteLigne } from "@/lib/stock";

export type LigneDemande = { article_id: string; quantite: number };

export type LigneMission = {
  article_id: string;
  reference: string;
  designation: string;
  disponible: number;
  propose: number;
  besoin_restant: number;
};

export type Mission = {
  palette_id: string;
  numero: string;
  emplacement: string;
  lignes: LigneMission[];
};

/**
 * Construit le parcours par palette : une mission regroupe toutes les références
 * demandées présentes sur la palette. Tri : nb de références couvertes (desc),
 * puis emplacement, puis numéro de palette.
 */
export function calculerParcours(besoins: Map<string, number>, stock: PaletteLigne[]): Mission[] {
  const parPalette = new Map<string, { numero: string; emplacement: string; lignes: PaletteLigne[] }>();
  for (const l of stock) {
    if (!(besoins.get(l.article_id)! > 0) || l.quantite <= 0) continue;
    const p = parPalette.get(l.id) ?? {
      numero: l.numero,
      emplacement: l.emplacements?.code ?? "—",
      lignes: [],
    };
    p.lignes.push(l);
    parPalette.set(l.id, p);
  }

  const ordre = [...parPalette.entries()].sort(
    ([, a], [, b]) =>
      b.lignes.length - a.lignes.length ||
      a.emplacement.localeCompare(b.emplacement) ||
      a.numero.localeCompare(b.numero),
  );

  const restant = new Map(besoins);
  const missions: Mission[] = [];
  for (const [palette_id, p] of ordre) {
    const lignes: LigneMission[] = [];
    for (const l of p.lignes) {
      const besoin = restant.get(l.article_id) ?? 0;
      if (besoin <= 0) continue;
      const propose = Math.min(besoin, l.quantite);
      restant.set(l.article_id, besoin - propose);
      lignes.push({
        article_id: l.article_id,
        reference: l.articles?.reference ?? "—",
        designation: l.articles?.designation ?? "",
        disponible: l.quantite,
        propose,
        besoin_restant: besoin - propose,
      });
    }
    if (lignes.length) missions.push({ palette_id, numero: p.numero, emplacement: p.emplacement, lignes });
  }
  return missions;
}
