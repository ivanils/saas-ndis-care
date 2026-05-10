CREATE TABLE public.worker_policies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id UUID NOT NULL,
    worker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'pending', 
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.worker_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can view own policies" 
ON public.worker_policies FOR SELECT 
TO authenticated 
USING (auth.uid() = worker_id);

DO $$
DECLARE
    mi_id UUID;
    agency_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
    SELECT id INTO mi_id FROM auth.users ORDER BY last_sign_in_at DESC NULLS LAST LIMIT 1;

    DELETE FROM public.worker_policies WHERE worker_id = mi_id;

    INSERT INTO public.worker_policies (agency_id, worker_id, title, status)
    VALUES 
    (agency_id, mi_id, 'Acknowledge new Privacy Policy 2026', 'pending'),
    (agency_id, mi_id, 'Updated NDIS Code of Conduct', 'pending');
END $$;