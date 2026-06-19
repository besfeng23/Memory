CREATE POLICY memory_items_select_own_2 ON public.memory_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
