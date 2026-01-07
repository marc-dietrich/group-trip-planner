-- 0006_group_roles_rls.sql
-- Purpose: Add per-group role RLS for groups and group_members
-- Notes: additive, idempotent, safe for Supabase SQL editor and PostgreSQL >=14

BEGIN;

-- Ensure consistent schema resolution
SET search_path TO public;

-- Provide minimal auth schema + auth.uid() helper for local/test containers lacking Supabase defaults
DO $do$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        EXECUTE 'CREATE SCHEMA auth';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'uid'
          AND pronamespace = 'auth'::regnamespace
    ) THEN
        EXECUTE $fn$
            CREATE FUNCTION auth.uid() RETURNS uuid
            LANGUAGE sql STABLE
            AS $body$ SELECT NULLIF(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid $body$;
        $fn$;
    END IF;
END;
$do$;

-- Constrain role values without breaking existing rows (NOT VALID allows later validation)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'group_members_role_check'
          AND conrelid = 'group_members'::regclass
    ) THEN
        ALTER TABLE group_members
            ADD CONSTRAINT group_members_role_check
                CHECK (role IN ('owner', 'admin', 'member')) NOT VALID;
    END IF;
END;
$$;

-- Avoid duplicate memberships per user within a group while keeping the existing PK
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'group_members_unique_user'
          AND conrelid = 'group_members'::regclass
    ) THEN
        ALTER TABLE group_members
            ADD CONSTRAINT group_members_unique_user
                UNIQUE (group_id, user_id) DEFERRABLE INITIALLY DEFERRED;
    END IF;
END;
$$;

-- Enable RLS (idempotent)
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Auto-create owner membership for the creator (Supabase auth user)
CREATE OR REPLACE FUNCTION public.fn_group_owner_seed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_display text;
BEGIN
    -- Only run when called with an authenticated user
    IF v_uid IS NULL THEN
        RETURN NEW;
    END IF;

    -- Derive a display name from JWT if available; fallback to 'Owner'
    BEGIN
        v_display := COALESCE(
            (current_setting('request.jwt.claims', true)::json ->> 'name'),
            (current_setting('request.jwt.claims', true)::json ->> 'email'),
            'Owner'
        );
    EXCEPTION WHEN others THEN
        v_display := 'Owner';
    END;

    -- Insert owner membership if it does not already exist for this user and group
    IF NOT EXISTS (
        SELECT 1 FROM group_members gm
        WHERE gm.group_id = NEW.id AND gm.user_id = v_uid
    ) THEN
        INSERT INTO group_members (group_id, user_id, actor_id, display_name, role, joined_at)
        VALUES (NEW.id, v_uid, v_uid::text, v_display, 'owner', now());
    END IF;

    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_group_owner_seed'
          AND tgrelid = 'groups'::regclass
    ) THEN
        CREATE TRIGGER trg_group_owner_seed
        AFTER INSERT ON groups
        FOR EACH ROW
        EXECUTE FUNCTION public.fn_group_owner_seed();
    END IF;
END;
$$;

-- Helper predicates reused in policies
-- Membership match: caller is a member of the same group (by user_id or actor_id)
CREATE OR REPLACE VIEW public.v_group_membership_match AS
SELECT gm.group_id,
       gm.user_id,
       gm.actor_id,
       gm.role
FROM group_members gm;

-- RLS policies for groups
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'groups' AND policyname = 'groups_select_member'
    ) THEN
        CREATE POLICY groups_select_member
        ON groups
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM group_members gm
                WHERE gm.group_id = groups.id
                  AND (gm.user_id = auth.uid() OR gm.actor_id = auth.uid()::text)
            )
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'groups' AND policyname = 'groups_insert_any_authenticated'
    ) THEN
        CREATE POLICY groups_insert_any_authenticated
        ON groups
        FOR INSERT
        WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'groups' AND policyname = 'groups_delete_owner'
    ) THEN
        CREATE POLICY groups_delete_owner
        ON groups
        FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM group_members gm
                WHERE gm.group_id = groups.id
                  AND (gm.user_id = auth.uid() OR gm.actor_id = auth.uid()::text)
                  AND gm.role = 'owner'
            )
        );
    END IF;
END;
$$;

-- RLS policies for group_members
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_members' AND policyname = 'group_members_select_in_group'
    ) THEN
        CREATE POLICY group_members_select_in_group
        ON group_members
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM group_members gm
                WHERE gm.group_id = group_members.group_id
                  AND (gm.user_id = auth.uid() OR gm.actor_id = auth.uid()::text)
            )
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_members' AND policyname = 'group_members_insert_by_admins'
    ) THEN
        CREATE POLICY group_members_insert_by_admins
        ON group_members
        FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM group_members gm
                WHERE gm.group_id = group_members.group_id
                  AND (gm.user_id = auth.uid() OR gm.actor_id = auth.uid()::text)
                  AND gm.role IN ('owner', 'admin')
            )
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_members' AND policyname = 'group_members_delete_by_admins'
    ) THEN
        CREATE POLICY group_members_delete_by_admins
        ON group_members
        FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM group_members gm
                WHERE gm.group_id = group_members.group_id
                  AND (gm.user_id = auth.uid() OR gm.actor_id = auth.uid()::text)
                  AND gm.role IN ('owner', 'admin')
            )
        );
    END IF;
END;
$$;

COMMIT;
