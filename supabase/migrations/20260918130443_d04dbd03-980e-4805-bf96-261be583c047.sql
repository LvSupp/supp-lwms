-- 1. Colonnes type et capacité
ALTER TABLE public.emplacements
  ADD COLUMN IF NOT EXISTS type_emplacement text NOT NULL DEFAULT 'STOCK',
  ADD COLUMN IF NOT EXISTS capacite_max integer;

ALTER TABLE public.emplacements
  DROP CONSTRAINT IF EXISTS emplacements_type_check;
ALTER TABLE public.emplacements
  ADD CONSTRAINT emplacements_type_check CHECK (type_emplacement IN ('STOCK','RECEPTION'));

ALTER TABLE public.emplacements
  DROP CONSTRAINT IF EXISTS emplacements_capacite_positive;
ALTER TABLE public.emplacements
  ADD CONSTRAINT emplacements_capacite_positive CHECK (capacite_max IS NULL OR capacite_max > 0);

-- 2. Reprise des données existantes : capacité 1, ou occupation actuelle si supérieure
UPDATE public.emplacements e
SET capacite_max = GREATEST(1, (SELECT count(*) FROM public.palettes p WHERE p.emplacement_id = e.id))
WHERE e.capacite_max IS NULL AND e.type_emplacement = 'STOCK';

-- 3. Emplacement RECEPTION idempotent (site principal existant)
INSERT INTO public.emplacements (code, site_id, actif, type_emplacement, capacite_max)
SELECT 'RECEPTION', s.id, true, 'RECEPTION', NULL
FROM public.sites s
WHERE NOT EXISTS (SELECT 1 FROM public.emplacements WHERE type_emplacement = 'RECEPTION')
ORDER BY s.created_at
LIMIT 1;

-- La Réception est toujours illimitée et active
UPDATE public.emplacements
SET capacite_max = NULL, actif = true
WHERE type_emplacement = 'RECEPTION';

-- 4. Résolution de la Réception (jamais par libellé)
CREATE OR REPLACE FUNCTION public.emplacement_reception()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.emplacements
  WHERE type_emplacement = 'RECEPTION' AND actif
  ORDER BY created_at
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.emplacement_reception() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.emplacement_reception() TO authenticated, service_role;

-- 5. Garde-fou capacité sur l'affectation des palettes
CREATE OR REPLACE FUNCTION public.verifier_capacite_emplacement()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_capacite integer;
  v_code text;
  v_occupation integer;
BEGIN
  IF NEW.emplacement_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.emplacement_id IS NOT DISTINCT FROM NEW.emplacement_id THEN
    RETURN NEW;
  END IF;

  SELECT capacite_max, code INTO v_capacite, v_code
  FROM public.emplacements WHERE id = NEW.emplacement_id FOR UPDATE;

  IF v_capacite IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_occupation
  FROM public.palettes
  WHERE emplacement_id = NEW.emplacement_id AND id <> NEW.id;

  IF v_occupation >= v_capacite THEN
    RAISE EXCEPTION 'Impossible de déplacer la palette : l''emplacement % a atteint sa capacité maximale (% palette(s)).', v_code, v_capacite;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS palettes_capacite ON public.palettes;
CREATE TRIGGER palettes_capacite
BEFORE INSERT OR UPDATE OF emplacement_id ON public.palettes
FOR EACH ROW EXECUTE FUNCTION public.verifier_capacite_emplacement();

-- 6. Capacité jamais inférieure à l'occupation, Réception toujours illimitée
CREATE OR REPLACE FUNCTION public.verifier_capacite_parametrage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_occupation integer;
BEGIN
  IF NEW.type_emplacement = 'RECEPTION' THEN
    NEW.capacite_max := NULL;
  END IF;

  IF NEW.capacite_max IS NOT NULL THEN
    SELECT count(*) INTO v_occupation FROM public.palettes WHERE emplacement_id = NEW.id;
    IF NEW.capacite_max < v_occupation THEN
      RAISE EXCEPTION 'La capacité de l''emplacement % ne peut pas être inférieure à son occupation actuelle (% palette(s)).', NEW.code, v_occupation;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS emplacements_capacite_parametrage ON public.emplacements;
CREATE TRIGGER emplacements_capacite_parametrage
BEFORE INSERT OR UPDATE ON public.emplacements
FOR EACH ROW EXECUTE FUNCTION public.verifier_capacite_parametrage();

-- 7. Protection contre la suppression
CREATE OR REPLACE FUNCTION public.proteger_suppression_emplacement()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.type_emplacement = 'RECEPTION' THEN
    RAISE EXCEPTION 'L''emplacement de Réception ne peut pas être supprimé.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.palettes WHERE emplacement_id = OLD.id) THEN
    RAISE EXCEPTION 'L''emplacement % contient encore des palettes et ne peut pas être supprimé.', OLD.code;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS emplacements_protection_suppression ON public.emplacements;
CREATE TRIGGER emplacements_protection_suppression
BEFORE DELETE ON public.emplacements
FOR EACH ROW EXECUTE FUNCTION public.proteger_suppression_emplacement();

-- 8. Création de palette : plus d'emplacement en entrée, affectation en Réception
DROP FUNCTION IF EXISTS public.creer_palette(uuid, integer, text, uuid);

CREATE OR REPLACE FUNCTION public.creer_palette(p_article_id uuid, p_quantite integer, p_lot text)
RETURNS public.palettes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_palette public.palettes;
  v_numero text;
  v_nom text;
  v_prefixe text;
  v_longueur integer;
  v_reception uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifie';
  END IF;
  IF p_quantite IS NULL OR p_quantite <= 0 THEN
    RAISE EXCEPTION 'Quantite invalide';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.articles WHERE id = p_article_id AND actif) THEN
    RAISE EXCEPTION 'Article inactif ou introuvable';
  END IF;

  v_reception := public.emplacement_reception();
  IF v_reception IS NULL THEN
    RAISE EXCEPTION 'Aucun emplacement de Réception actif n''est configuré';
  END IF;

  SELECT prefixe, longueur INTO v_prefixe, v_longueur FROM public.parametres_numerotation WHERE id;
  v_prefixe := coalesce(v_prefixe, 'PAL-');
  v_longueur := coalesce(v_longueur, 6);

  v_numero := v_prefixe || lpad(nextval('public.palette_numero_seq')::text, v_longueur, '0');
  SELECT nom INTO v_nom FROM public.profils WHERE id = auth.uid();

  INSERT INTO public.palettes (numero, article_id, quantite, lot, emplacement_id, created_by)
  VALUES (v_numero, p_article_id, p_quantite, nullif(p_lot, ''), v_reception, auth.uid())
  RETURNING * INTO v_palette;

  INSERT INTO public.mouvements (type, palette_id, source_id, destination_id, utilisateur_id, utilisateur_nom)
  VALUES ('ENTREE', v_palette.id, NULL, v_reception, auth.uid(), v_nom);

  RETURN v_palette;
END;
$$;

REVOKE ALL ON FUNCTION public.creer_palette(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creer_palette(uuid, integer, text) TO authenticated, service_role;

-- 9. Déplacement : contrôle de capacité atomique
CREATE OR REPLACE FUNCTION public.deplacer_palette(p_palette_id uuid, p_destination_id uuid)
RETURNS public.palettes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_palette public.palettes;
  v_source uuid;
  v_nom text;
  v_capacite integer;
  v_code text;
  v_actif boolean;
  v_occupation integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifie';
  END IF;

  SELECT emplacement_id INTO v_source FROM public.palettes WHERE id = p_palette_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Palette introuvable';
  END IF;
  IF v_source IS NOT DISTINCT FROM p_destination_id THEN
    RAISE EXCEPTION 'La palette est deja sur cet emplacement';
  END IF;

  SELECT capacite_max, code, actif INTO v_capacite, v_code, v_actif
  FROM public.emplacements WHERE id = p_destination_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Emplacement introuvable';
  END IF;
  IF NOT v_actif THEN
    RAISE EXCEPTION 'L''emplacement % est désactivé', v_code;
  END IF;

  IF v_capacite IS NOT NULL THEN
    SELECT count(*) INTO v_occupation
    FROM public.palettes WHERE emplacement_id = p_destination_id AND id <> p_palette_id;
    IF v_occupation >= v_capacite THEN
      RAISE EXCEPTION 'Impossible de déplacer la palette : l''emplacement % a atteint sa capacité maximale (% palette(s)).', v_code, v_capacite;
    END IF;
  END IF;

  SELECT nom INTO v_nom FROM public.profils WHERE id = auth.uid();

  UPDATE public.palettes SET emplacement_id = p_destination_id, statut = 'EN_STOCK'
  WHERE id = p_palette_id RETURNING * INTO v_palette;

  INSERT INTO public.mouvements (type, palette_id, source_id, destination_id, utilisateur_id, utilisateur_nom)
  VALUES ('DEPLACEMENT', p_palette_id, v_source, p_destination_id, auth.uid(), v_nom);

  RETURN v_palette;
END;
$$;

REVOKE ALL ON FUNCTION public.deplacer_palette(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deplacer_palette(uuid, uuid) TO authenticated, service_role;