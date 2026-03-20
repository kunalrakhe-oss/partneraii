-- Re-attach the trigger to create profiles on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert the missing profile for the existing user
INSERT INTO public.profiles (user_id, display_name, phone, app_mode)
VALUES (
  '814ef51a-e158-4ff8-9db2-59a929c90751',
  'Anil Singh Chouhan',
  '8458023831',
  'single'
)
ON CONFLICT (user_id) DO NOTHING;