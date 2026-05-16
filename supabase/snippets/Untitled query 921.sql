DO $$
DECLARE
    mi_id UUID;
    arthur_id UUID := '33333333-3333-3333-3333-333333333333';
    agency_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
    SELECT id INTO mi_id FROM auth.users ORDER BY last_sign_in_at DESC NULLS LAST LIMIT 1;

    INSERT INTO public.shifts (agency_id, worker_id, participant_id, start_time, end_time, status)
    VALUES (agency_id, mi_id, arthur_id, NOW() - INTERVAL '2 days' - INTERVAL '4 hours', NOW() - INTERVAL '2 days', 'completed');

    INSERT INTO public.shifts (agency_id, worker_id, participant_id, start_time, end_time, status)
    VALUES (agency_id, mi_id, arthur_id, NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '4 hours', 'approved');

    INSERT INTO public.shifts (agency_id, worker_id, participant_id, start_time, end_time, status)
    VALUES (agency_id, mi_id, arthur_id, NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '6 hours', 'approved');
END $$;