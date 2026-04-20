ALTER TABLE public.preset_tracks ADD COLUMN IF NOT EXISTS track_geojson jsonb;

CREATE OR REPLACE FUNCTION public.upsert_track_geojson(_track_id uuid, _geojson jsonb)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.preset_tracks SET track_geojson = _geojson WHERE id = _track_id;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_track_geojson(uuid, jsonb) TO authenticated;