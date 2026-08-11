-- Allow users to read their own profile row (fixes bootstrap / get_user_tenant edge cases)
DROP POLICY IF EXISTS profiles_select ON profiles;

CREATE POLICY profiles_select ON profiles FOR SELECT USING (
  id = auth.uid() OR tenant_id = get_user_tenant()
);
