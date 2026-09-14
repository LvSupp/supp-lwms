-- PROFILS
CREATE TABLE public.profils (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nom text NOT NULL DEFAULT '',
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profils TO authenticated;
GRANT ALL ON public.profils TO service_role;
ALTER TABLE public.profils ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profils lisibles par les connectes" ON public.profils FOR SELECT TO authenticated USING (true);
CREATE POLICY "chacun modifie son profil" ON public.profils FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "chacun cree son profil" ON public.profils FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profils (id, nom, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nom', split_part(NEW.email, '@', 1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SITES
CREATE TABLE public.sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sites TO authenticated;
GRANT ALL ON public.sites TO service_role;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sites acces connectes" ON public.sites FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- EMPLACEMENTS
CREATE TABLE public.emplacements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emplacements TO authenticated;
GRANT ALL ON public.emplacements TO service_role;
ALTER TABLE public.emplacements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emplacements acces connectes" ON public.emplacements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ARTICLES
CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  designation text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "articles acces connectes" ON public.articles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PALETTES
CREATE SEQUENCE public.palette_numero_seq START 1;
CREATE TABLE public.palettes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL UNIQUE,
  article_id uuid NOT NULL REFERENCES public.articles(id),
  quantite integer NOT NULL DEFAULT 1,
  lot text,
  emplacement_id uuid REFERENCES public.emplacements(id),
  statut text NOT NULL DEFAULT 'EN_STOCK',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.palettes TO authenticated;
GRANT ALL ON public.palettes TO service_role;
ALTER TABLE public.palettes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "palettes acces connectes" ON public.palettes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- MOUVEMENTS
CREATE TABLE public.mouvements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL,
  palette_id uuid NOT NULL REFERENCES public.palettes(id) ON DELETE CASCADE,
  source_id uuid REFERENCES public.emplacements(id),
  destination_id uuid REFERENCES public.emplacements(id),
  utilisateur_id uuid REFERENCES auth.users,
  utilisateur_nom text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mouvements TO authenticated;
GRANT ALL ON public.mouvements TO service_role;
ALTER TABLE public.mouvements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mouvements acces connectes" ON public.mouvements FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_palettes_emplacement ON public.palettes(emplacement_id);
CREATE INDEX idx_mouvements_date ON public.mouvements(created_at DESC);

-- CREATION PALETTE
CREATE OR REPLACE FUNCTION public.creer_palette(
  p_article_id uuid,
  p_quantite integer,
  p_lot text,
  p_emplacement_id uuid
) RETURNS public.palettes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_palette public.palettes;
  v_numero text;
  v_nom text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifie';
  END IF;
  IF p_quantite IS NULL OR p_quantite <= 0 THEN
    RAISE EXCEPTION 'Quantite invalide';
  END IF;
  v_numero := 'PAL-' || lpad(nextval('public.palette_numero_seq')::text, 6, '0');
  SELECT nom INTO v_nom FROM public.profils WHERE id = auth.uid();

  INSERT INTO public.palettes (numero, article_id, quantite, lot, emplacement_id, created_by)
  VALUES (v_numero, p_article_id, p_quantite, nullif(p_lot, ''), p_emplacement_id, auth.uid())
  RETURNING * INTO v_palette;

  INSERT INTO public.mouvements (type, palette_id, source_id, destination_id, utilisateur_id, utilisateur_nom)
  VALUES ('ENTREE', v_palette.id, NULL, p_emplacement_id, auth.uid(), v_nom);

  RETURN v_palette;
END;
$$;
GRANT EXECUTE ON FUNCTION public.creer_palette(uuid, integer, text, uuid) TO authenticated;

-- DEPLACEMENT PALETTE
CREATE OR REPLACE FUNCTION public.deplacer_palette(
  p_palette_id uuid,
  p_destination_id uuid
) RETURNS public.palettes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_palette public.palettes;
  v_source uuid;
  v_nom text;
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
  SELECT nom INTO v_nom FROM public.profils WHERE id = auth.uid();

  UPDATE public.palettes SET emplacement_id = p_destination_id, statut = 'EN_STOCK'
  WHERE id = p_palette_id RETURNING * INTO v_palette;

  INSERT INTO public.mouvements (type, palette_id, source_id, destination_id, utilisateur_id, utilisateur_nom)
  VALUES ('DEPLACEMENT', p_palette_id, v_source, p_destination_id, auth.uid(), v_nom);

  RETURN v_palette;
END;
$$;
GRANT EXECUTE ON FUNCTION public.deplacer_palette(uuid, uuid) TO authenticated;

-- DONNEES DE DEPART
INSERT INTO public.sites (id, nom) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Entrepôt Nord'),
  ('22222222-2222-2222-2222-222222222222', 'Entrepôt Sud');

INSERT INTO public.emplacements (code, site_id) VALUES
  ('A-01-01', '11111111-1111-1111-1111-111111111111'),
  ('A-01-02', '11111111-1111-1111-1111-111111111111'),
  ('A-02-01', '11111111-1111-1111-1111-111111111111'),
  ('B-01-01', '11111111-1111-1111-1111-111111111111'),
  ('QUAI-1', '11111111-1111-1111-1111-111111111111'),
  ('S-01-01', '22222222-2222-2222-2222-222222222222'),
  ('S-01-02', '22222222-2222-2222-2222-222222222222');

INSERT INTO public.articles (reference, designation) VALUES
  ('ART-1001', 'Carton 40x30 - Blanc'),
  ('ART-1002', 'Bidon 5L - Détergent'),
  ('ART-1003', 'Sac 25kg - Granulés'),
  ('ART-1004', 'Palette bois EUR');