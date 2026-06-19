CREATE POLICY memory_items_insert_own_2 ON public.memory_items FOR
INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
