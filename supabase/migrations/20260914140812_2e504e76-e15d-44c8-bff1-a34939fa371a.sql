REVOKE ALL ON FUNCTION public.creer_palette(uuid, integer, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.deplacer_palette(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.creer_palette(uuid, integer, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deplacer_palette(uuid, uuid) TO authenticated;