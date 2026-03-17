
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  partner_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view partner profile" ON public.profiles FOR SELECT USING (
  id = (SELECT partner_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Partner pairing table
CREATE TABLE public.partner_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invites" ON public.partner_invites FOR SELECT USING (auth.uid() = inviter_id OR auth.uid() = accepted_by);
CREATE POLICY "Users can create invites" ON public.partner_invites FOR INSERT WITH CHECK (auth.uid() = inviter_id);
CREATE POLICY "Authenticated users can accept invites" ON public.partner_invites FOR UPDATE USING (accepted_by IS NULL) WITH CHECK (auth.uid() = accepted_by);

-- Memories table
CREATE TABLE public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_pair TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('photo', 'milestone', 'note')),
  photo_url TEXT,
  memory_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

-- Helper function to get partner pair key
CREATE OR REPLACE FUNCTION public.get_partner_pair(uid UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN p.user_id::text < COALESCE(p2.user_id::text, '') THEN p.user_id::text || ':' || p2.user_id::text
    ELSE p2.user_id::text || ':' || p.user_id::text
  END
  FROM profiles p
  LEFT JOIN profiles p2 ON p2.id = p.partner_id
  WHERE p.user_id = uid
$$;

CREATE POLICY "Users can view couple memories" ON public.memories FOR SELECT USING (partner_pair = public.get_partner_pair(auth.uid()));
CREATE POLICY "Users can create memories" ON public.memories FOR INSERT WITH CHECK (auth.uid() = user_id AND partner_pair = public.get_partner_pair(auth.uid()));
CREATE POLICY "Users can update own memories" ON public.memories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own memories" ON public.memories FOR DELETE USING (auth.uid() = user_id);

-- Grocery items table
CREATE TABLE public.grocery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_pair TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'other',
  is_checked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.grocery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view couple groceries" ON public.grocery_items FOR SELECT USING (partner_pair = public.get_partner_pair(auth.uid()));
CREATE POLICY "Users can add groceries" ON public.grocery_items FOR INSERT WITH CHECK (auth.uid() = user_id AND partner_pair = public.get_partner_pair(auth.uid()));
CREATE POLICY "Users can update couple groceries" ON public.grocery_items FOR UPDATE USING (partner_pair = public.get_partner_pair(auth.uid()));
CREATE POLICY "Users can delete couple groceries" ON public.grocery_items FOR DELETE USING (partner_pair = public.get_partner_pair(auth.uid()));

-- Chores table
CREATE TABLE public.chores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_pair TEXT NOT NULL,
  title TEXT NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  due_date DATE,
  recurrence TEXT CHECK (recurrence IN ('daily', 'weekly', 'monthly', NULL)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view couple chores" ON public.chores FOR SELECT USING (partner_pair = public.get_partner_pair(auth.uid()));
CREATE POLICY "Users can add chores" ON public.chores FOR INSERT WITH CHECK (auth.uid() = user_id AND partner_pair = public.get_partner_pair(auth.uid()));
CREATE POLICY "Users can update couple chores" ON public.chores FOR UPDATE USING (partner_pair = public.get_partner_pair(auth.uid()));
CREATE POLICY "Users can delete couple chores" ON public.chores FOR DELETE USING (partner_pair = public.get_partner_pair(auth.uid()));

-- Storage bucket for memory photos
INSERT INTO storage.buckets (id, name, public) VALUES ('memory-photos', 'memory-photos', true);

CREATE POLICY "Users can upload photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'memory-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can view photos" ON storage.objects FOR SELECT USING (bucket_id = 'memory-photos');
CREATE POLICY "Users can delete own photos" ON storage.objects FOR DELETE USING (bucket_id = 'memory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_memories_updated_at BEFORE UPDATE ON public.memories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chores_updated_at BEFORE UPDATE ON public.chores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
