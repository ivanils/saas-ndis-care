ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';

UPDATE public.profiles 
SET role = 'super_admin'::user_role 
WHERE id = '9952cca4-6a04-467e-bf29-9802d6dfee74'::uuid;