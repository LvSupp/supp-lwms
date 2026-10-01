CREATE OR REPLACE FUNCTION public.prelever_palette(p_palette_id uuid, p_lignes jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_empl uuid; v_legacy_article uuid; v_legacy_qte integer; v_nom text;
  v_ligne jsonb; v_article uuid; v_qte integer; v_dispo integer; v_total integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Utilisateur non authentifie'; END IF;
  SELECT emplacement_id, article_id, coalesce(quantite,0) INTO v_empl, v_legacy_article, v_legacy_qte
  FROM public.palettes WHERE id = p_palette_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Palette introuvable'; END IF;
  IF p_lignes IS NULL OR jsonb_typeof(p_lignes) <> 'array' THEN RAISE EXCEPTION 'Lignes invalides'; END IF;

  FOR v_ligne IN SELECT * FROM jsonb_array_elements(p_lignes) LOOP
    v_article := (v_ligne->>'article_id')::uuid;
    v_qte := coalesce((v_ligne->>'quantite')::integer, 0);
    IF v_qte < 0 THEN RAISE EXCEPTION 'Quantité invalide'; END IF;
    CONTINUE WHEN v_qte = 0;
    SELECT quantite INTO v_dispo FROM public.palette_contenus
      WHERE palette_id = p_palette_id AND article_id = v_article FOR UPDATE;
    IF FOUND THEN
      IF v_qte > v_dispo THEN RAISE EXCEPTION 'Quantité prélevée supérieure au disponible'; END IF;
      IF v_qte = v_dispo THEN
        DELETE FROM public.palette_contenus WHERE palette_id = p_palette_id AND article_id = v_article;
      ELSE
        UPDATE public.palette_contenus SET quantite = quantite - v_qte WHERE palette_id = p_palette_id AND article_id = v_article;
      END IF;
    ELSIF v_legacy_article = v_article THEN
      IF v_qte > v_legacy_qte THEN RAISE EXCEPTION 'Quantité prélevée supérieure au disponible'; END IF;
      v_legacy_qte := v_legacy_qte - v_qte;
      UPDATE public.palettes SET quantite = v_legacy_qte WHERE id = p_palette_id;
    ELSE
      RAISE EXCEPTION 'Référence absente de la palette';
    END IF;
    v_total := v_total + v_qte;
  END LOOP;

  IF v_total > 0 THEN
    SELECT nom INTO v_nom FROM public.profils WHERE id = auth.uid();
    INSERT INTO public.mouvements (type, palette_id, source_id, destination_id, utilisateur_id, utilisateur_nom)
    VALUES ('PREPARATION', p_palette_id, v_empl, NULL, auth.uid(), v_nom);
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.prelever_palette(uuid, jsonb) TO authenticated;