-- Secure RPC to fetch accurate registration counts per event, bypassing RLS safely
CREATE OR REPLACE FUNCTION public.get_event_registration_counts(p_event_ids uuid[])
RETURNS TABLE (event_id uuid, registration_count integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ids AS (
    SELECT unnest(p_event_ids) AS id
  )
  SELECT 
    ids.id AS event_id,
    COALESCE(COUNT(er.*), 0)::integer AS registration_count
  FROM ids
  LEFT JOIN public.event_registrations er
    ON er.event_id = ids.id
  GROUP BY ids.id
  ORDER BY ids.id;
$$;

-- Allow authenticated and anon roles to execute this function
GRANT EXECUTE ON FUNCTION public.get_event_registration_counts(uuid[]) TO anon, authenticated;

COMMENT ON FUNCTION public.get_event_registration_counts(uuid[]) IS 'Returns registration counts for the provided event IDs. Implemented as SECURITY DEFINER to avoid exposing individual registrations via RLS.';