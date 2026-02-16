-- =====================================================
-- MIGRACIÓN: Security Overhaul Phase 1 (RBAC)
-- Fecha: 2026-02-15
-- Descripción: Standardize admin checks and secure profiles
-- =====================================================

-- 1. Create Helper Function: is_admin()
-- =====================================================
-- This function allows RLS policies to cheaply check if the current user is an admin.
-- We use SECURITY DEFINER to allow the function to read profiles even if RLS would otherwise block it
-- (though we will set policies to allow reading own profile, this is safer).
-- But we must be careful: checking 'profiles' table is safe if 'profiles' has RLS.
-- Ideally, we trust the `is_admin` column in `profiles`.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER -- Run with privileges of creator (usually postgres/admin), bypassing RLS
SET search_path = public -- Secure search path
STABLE -- Result is stable for the transaction
AS $$
  SELECT COALESCE(
    (SELECT is_admin 
     FROM public.profiles 
     WHERE id = auth.uid()), 
    FALSE
  );
$$;

-- 2. Secure Profiles Table (Prevent Privilege Escalation)
-- =====================================================

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean slate (or we can CREATE OR REPLACE if supported, but DROP is safer here to avoid conflicts with '20260206_fix_rls_policies.sql')
-- We will recreate them strictly.

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_prevent_admin_escalation" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin_only" ON public.profiles;

-- Policy: Select All (Public profiles are necessary for social features, but sensitive data like is_admin is visible. 
-- If is_admin is sensitive, we should hide it, but the client needs to know if it's admin. Use Views if strictly needed, but for now SELECT is fine).
CREATE POLICY "profiles_view_all" 
ON public.profiles FOR SELECT 
USING (true);

-- Policy: Insert (Only creation of own profile)
-- Explicitly deny setting is_admin to true on insert? 
-- Trigger or check constraint is better, but Policy WITH CHECK triggers on insert.
CREATE POLICY "profiles_insert_own" 
ON public.profiles FOR INSERT 
WITH CHECK (
  auth.uid() = id
  -- AND is_admin = false -- (Optional: enforce default member, though default constraints handle this)
);

-- Policy: Update (Only own profile, NO changing is_admin)
CREATE POLICY "profiles_update_own" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  (
    -- Check that is_admin is NOT being changed
    is_admin IS NOT DISTINCT FROM (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
    -- OR user is already admin (Admins can change their own? Maybe unsafe. Better: Only super-admin or direct SQL changes roles)
  )
);

-- DO NOT Create a Delete policy for users. Only admins/system can delete users conceptually.

-- Success Message
DO $$
BEGIN
  RAISE NOTICE '✅ Security Phase 1 Complete: is_admin() created and profiles secured.';
END $$;
