-- Promote the specific user to admin role
-- This is a one-time operation to fix the admin user that was created as a student

UPDATE public.profiles 
SET role = 'admin'
WHERE user_id = '9bb1530f-f2a0-4669-b723-241c4d52aebb';

UPDATE public.user_roles 
SET role = 'admin'::app_role
WHERE user_id = '9bb1530f-f2a0-4669-b723-241c4d52aebb';