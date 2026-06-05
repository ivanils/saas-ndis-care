ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agencies Isolation" ON public.agencies
FOR ALL USING (
  public.is_super_admin() OR id = public.get_my_agency_id()
);

CREATE POLICY "Profiles Isolation" ON public.profiles
FOR ALL USING (
  public.is_super_admin() OR id = auth.uid() OR agency_id = public.get_my_agency_id()
);

CREATE POLICY "Participants Isolation" ON public.participants
FOR ALL USING (
  public.is_super_admin() OR agency_id = public.get_my_agency_id()
);

CREATE POLICY "Shifts Isolation" ON public.shifts
FOR ALL USING (
  public.is_super_admin() OR agency_id = public.get_my_agency_id()
);