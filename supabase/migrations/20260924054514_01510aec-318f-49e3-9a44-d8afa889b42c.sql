CREATE TABLE public.palette_contenus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  palette_id uuid NOT NULL REFERENCES public.palettes(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES public.articles(id),
  quantite integer NOT NULL CHECK (quantite > 0),
  statut text NOT NULL DEFAULT 'DISPONIBLE' CHECK (statut IN ('DISPONIBLE','BLOQUE','RESERVE')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT palette_contenus_palette_article_key UNIQUE (palette_id, article_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.palette_contenus TO authenticated;
GRANT ALL ON public.palette_contenus TO service_role;
ALTER TABLE public.palette_contenus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "palette_contenus acces connectes" ON public.palette_contenus FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX palette_contenus_article_idx ON public.palette_contenus(article_id);
CREATE TRIGGER update_palette_contenus_updated_at BEFORE UPDATE ON public.palette_contenus
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.palette_contenus (palette_id, article_id, quantite, statut, created_at)
SELECT id, article_id, quantite, 'DISPONIBLE', created_at FROM public.palettes
WHERE article_id IS NOT NULL AND quantite > 0
ON CONFLICT (palette_id, article_id) DO NOTHING;

ALTER TABLE public.palettes ALTER COLUMN article_id DROP NOT NULL;
ALTER TABLE public.palettes ALTER COLUMN quantite DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.creer_palette_multi(p_numero text, p_lignes jsonb)
RETURNS public.palettes
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_palette public.palettes;
  v_numero text := nullif(trim(coalesce(p_numero, '')), '');
  v_prefixe text; v_longueur integer; v_reception uuid; v_nom text;
  v_ligne jsonb; v_article uuid; v_qte integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Utilisateur non authentifie'; END IF;
  IF p_lignes IS NULL OR jsonb_typeof(p_lignes) <> 'array' OR jsonb_array_length(p_lignes) = 0 THEN
    RAISE EXCEPTION 'La palette doit contenir au moins une référence';
  END IF;
  v_reception := public.emplacement_reception();
  IF v_reception IS NULL THEN RAISE EXCEPTION 'Aucun emplacement de Réception actif n''est configuré'; END IF;

  IF v_numero IS NULL THEN
    SELECT prefixe, longueur INTO v_prefixe, v_longueur FROM public.parametres_numerotation WHERE id;
    v_numero := coalesce(v_prefixe, 'PAL-') || lpad(nextval('public.palette_numero_seq')::text, coalesce(v_longueur, 6), '0');
  ELSIF EXISTS (SELECT 1 FROM public.palettes WHERE lower(numero) = lower(v_numero)) THEN
    RAISE EXCEPTION 'Le code palette % existe déjà', v_numero;
  END IF;

  SELECT nom INTO v_nom FROM public.profils WHERE id = auth.uid();
  INSERT INTO public.palettes (numero, emplacement_id, created_by)
  VALUES (v_numero, v_reception, auth.uid()) RETURNING * INTO v_palette;

  FOR v_ligne IN SELECT * FROM jsonb_array_elements(p_lignes) LOOP
    v_article := (v_ligne->>'article_id')::uuid;
    v_qte := (v_ligne->>'quantite')::integer;
    IF v_qte IS NULL OR v_qte <= 0 THEN RAISE EXCEPTION 'Quantité invalide'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.articles WHERE id = v_article AND actif) THEN
      RAISE EXCEPTION 'Article inactif ou introuvable';
    END IF;
    IF EXISTS (SELECT 1 FROM public.palette_contenus WHERE palette_id = v_palette.id AND article_id = v_article) THEN
      RAISE EXCEPTION 'Une même référence ne peut apparaître qu''une fois sur la palette';
    END IF;
    INSERT INTO public.palette_contenus (palette_id, article_id, quantite) VALUES (v_palette.id, v_article, v_qte);
  END LOOP;

  INSERT INTO public.mouvements (type, palette_id, source_id, destination_id, utilisateur_id, utilisateur_nom)
  VALUES ('ENTREE', v_palette.id, NULL, v_reception, auth.uid(), v_nom);
  RETURN v_palette;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.creer_palette_multi(text, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.creer_palette_multi(text, jsonb) TO authenticated;