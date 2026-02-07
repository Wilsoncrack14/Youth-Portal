-- =====================================================
-- MIGRACIÓN: Corregir Políticas RLS Faltantes
-- Fecha: 2026-02-06
-- Descripción: Habilita RLS en tablas críticas y crea políticas de seguridad
-- =====================================================

-- 1. HABILITAR RLS EN TABLAS CRÍTICAS
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS PARA TABLA: profiles
-- =====================================================

-- Todos pueden ver todos los perfiles (para rankings, búsquedas, etc.)
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT
  USING (true);

-- Los usuarios solo pueden actualizar su propio perfil
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- PROTECCIÓN: Evitar que usuarios modifiquen el campo is_admin
CREATE POLICY "profiles_prevent_admin_escalation"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- El campo is_admin debe permanecer igual
    is_admin = (SELECT is_admin FROM profiles WHERE id = auth.uid())
  );

-- Solo usuarios autenticados pueden insertar su propio perfil
CREATE POLICY "profiles_insert_authenticated"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Los usuarios NO pueden eliminar su propio perfil (solo admins)
CREATE POLICY "profiles_delete_admin_only"
  ON profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- 3. POLÍTICAS PARA TABLA: posts
-- =====================================================

-- Todos pueden ver todas las publicaciones
CREATE POLICY "posts_select_all"
  ON posts FOR SELECT
  USING (true);

-- Solo usuarios autenticados pueden crear publicaciones
CREATE POLICY "posts_insert_authenticated"
  ON posts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    auth.role() = 'authenticated'
  );

-- Los usuarios solo pueden actualizar sus propias publicaciones
CREATE POLICY "posts_update_own"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden eliminar sus propias publicaciones
-- Los admins pueden eliminar cualquier publicación
CREATE POLICY "posts_delete_own_or_admin"
  ON posts FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- 4. POLÍTICAS PARA TABLA: reading_progress
-- =====================================================

-- Los usuarios solo pueden ver su propio progreso
CREATE POLICY "reading_progress_select_own"
  ON reading_progress FOR SELECT
  USING (auth.uid() = user_id);

-- Los usuarios solo pueden insertar su propio progreso
CREATE POLICY "reading_progress_insert_own"
  ON reading_progress FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    auth.role() = 'authenticated'
  );

-- Los usuarios solo pueden actualizar su propio progreso
CREATE POLICY "reading_progress_update_own"
  ON reading_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden eliminar su propio progreso
CREATE POLICY "reading_progress_delete_own"
  ON reading_progress FOR DELETE
  USING (auth.uid() = user_id);

-- 5. CREAR ÍNDICES PARA MEJORAR RENDIMIENTO
-- =====================================================

-- Índice para búsquedas por user_id en posts
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);

-- Índice para búsquedas por user_id en reading_progress
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id ON reading_progress(user_id);

-- 6. MENSAJE DE CONFIRMACIÓN
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Políticas RLS aplicadas correctamente';
  RAISE NOTICE '✅ Tablas protegidas: profiles, posts, reading_progress';
  RAISE NOTICE '✅ Índices creados para optimización';
END $$;
