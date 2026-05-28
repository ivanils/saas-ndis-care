ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

UPDATE public.profiles 
SET 
  phone = '0412 345 ' || floor(random() * 900 + 100)::text, 
  email = lower(first_name || '.' || last_name || '@bellvi.com') 
WHERE role = 'worker';