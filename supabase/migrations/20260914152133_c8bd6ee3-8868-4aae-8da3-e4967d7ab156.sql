ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS ean text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS actif boolean NOT NULL DEFAULT true;
CREATE UNIQUE INDEX IF NOT EXISTS articles_ean_unique ON public.articles (ean) WHERE ean IS NOT NULL;
ALTER TABLE public.emplacements ADD COLUMN IF NOT EXISTS actif boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.parametres_numerotation (
  id boolean PRIMARY KEY DEFAULT true,
  prefixe text NOT NULL DEFAULT 'PAL-',
  longueur integer NOT NULL DEFAULT 6,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT parametres_numerotation_unique_row CHECK (id),
  CONSTRAINT parametres_numerotation_longueur_valide CHECK (longueur BETWEEN 1 AND 12)
);

GRANT SELECT, INSERT, UPDATE ON public.parametres_numerotation TO authenticated;
GRANT ALL ON public.parametres_numerotation TO service_role;
ALTER TABLE public.parametres_numerotation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "numerotation lisible par les connectes" ON public.parametres_numerotation FOR SELECT TO authenticated USING (true);
CREATE POLICY "numerotation modifiable par les connectes" ON public.parametres_numerotation FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "numerotation creable par les connectes" ON public.parametres_numerotation FOR INSERT TO authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_parametres_numerotation_updated_at ON public.parametres_numerotation;
CREATE TRIGGER update_parametres_numerotation_updated_at BEFORE UPDATE ON public.parametres_numerotation
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.parametres_numerotation (id, prefixe, longueur) VALUES (true, 'PAL-', 6)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.creer_palette(p_article_id uuid, p_quantite integer, p_lot text, p_emplacement_id uuid)
 RETURNS palettes
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_palette public.palettes;
  v_numero text;
  v_nom text;
  v_prefixe text;
  v_longueur integer;
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
  IF NOT EXISTS (SELECT 1 FROM public.emplacements WHERE id = p_emplacement_id AND actif) THEN
    RAISE EXCEPTION 'Emplacement inactif ou introuvable';
  END IF;

  SELECT prefixe, longueur INTO v_prefixe, v_longueur FROM public.parametres_numerotation WHERE id;
  v_prefixe := coalesce(v_prefixe, 'PAL-');
  v_longueur := coalesce(v_longueur, 6);

  v_numero := v_prefixe || lpad(nextval('public.palette_numero_seq')::text, v_longueur, '0');
  SELECT nom INTO v_nom FROM public.profils WHERE id = auth.uid();

  INSERT INTO public.palettes (numero, article_id, quantite, lot, emplacement_id, created_by)
  VALUES (v_numero, p_article_id, p_quantite, nullif(p_lot, ''), p_emplacement_id, auth.uid())
  RETURNING * INTO v_palette;

  INSERT INTO public.mouvements (type, palette_id, source_id, destination_id, utilisateur_id, utilisateur_nom)
  VALUES ('ENTREE', v_palette.id, NULL, p_emplacement_id, auth.uid(), v_nom);

  RETURN v_palette;
END;
$function$;

REVOKE ALL ON FUNCTION public.creer_palette(uuid, integer, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creer_palette(uuid, integer, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.prochain_numero_palette() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT prefixe || lpad((last_value + CASE WHEN is_called THEN 1 ELSE 0 END)::text, longueur, '0')
  FROM public.parametres_numerotation, public.palette_numero_seq
  WHERE parametres_numerotation.id;
$$;
REVOKE ALL ON FUNCTION public.prochain_numero_palette() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prochain_numero_palette() TO authenticated;