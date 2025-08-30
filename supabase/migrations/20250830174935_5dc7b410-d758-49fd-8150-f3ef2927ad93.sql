-- Fix search path security issue for functions
CREATE OR REPLACE FUNCTION public.check_time_slot_conflict(
  p_event_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_event_id UUID DEFAULT NULL
) RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM events 
    WHERE event_date::DATE = p_event_date
    AND approval_status = 'approved'
    AND (p_event_id IS NULL OR id != p_event_id)
    AND (
      (start_time <= p_start_time AND end_time > p_start_time) OR
      (start_time < p_end_time AND end_time >= p_end_time) OR
      (start_time >= p_start_time AND end_time <= p_end_time)
    )
  );
END;
$$;

-- Fix other functions with search path
CREATE OR REPLACE FUNCTION public.get_user_profile(user_uuid uuid)
 RETURNS TABLE(id uuid, user_id uuid, full_name text, email text, role text, department text, year_of_study integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.email,
    p.role,
    p.department,
    p.year_of_study
  FROM profiles p
  WHERE p.user_id = user_uuid;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'New User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'student')
  );
  RETURN NEW;
END;
$$;