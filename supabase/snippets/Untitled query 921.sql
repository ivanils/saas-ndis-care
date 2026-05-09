ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Worker can view own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Authenticated can view participants" ON public.participants;

CREATE POLICY "Worker can view own shifts" 
ON public.shifts FOR SELECT 
TO authenticated 
USING (auth.uid() = worker_id);

CREATE POLICY "Authenticated can view participants" 
ON public.participants FOR SELECT 
TO authenticated 
USING (true);