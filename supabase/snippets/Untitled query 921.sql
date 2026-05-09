DO $$
DECLARE
    shift_ids UUID[];
BEGIN
    SELECT array_agg(id) INTO shift_ids
    FROM (
        SELECT id FROM public.shifts 
        WHERE participant_id = '33333333-3333-3333-3333-333333333333' 
        AND status = 'completed'
        LIMIT 3
    ) AS sub;

    DELETE FROM public.care_notes WHERE shift_id = ANY(shift_ids);

    DELETE FROM public.shifts WHERE id = ANY(shift_ids);
END $$;