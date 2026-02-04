-- SOLUCIÓN AL ERROR DE PERMISOS (RLS)
-- Copia y pega todo este código en el "SQL Editor" de tu panel de Supabase y ejecútalo.

BEGIN;

-- Eliminar políticas anteriores si existen para evitar duplicados
DROP POLICY IF EXISTS "Public Access to Lesson PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Admin Insert Lesson PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update Lesson PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Lesson PDFs" ON storage.objects;

-- 1. Acceso Público de Lectura (Para que los usuarios puedan ver el PDF)
CREATE POLICY "Public Access to Lesson PDFs"
ON storage.objects FOR SELECT
USING ( bucket_id = 'lesson-pdfs' );

-- 2. Acceso de Escritura solo para Admin (Insertar)
CREATE POLICY "Admin Insert Lesson PDFs"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'lesson-pdfs' AND public.check_is_admin() );

-- 3. Acceso de Edición solo para Admin (Actualizar)
CREATE POLICY "Admin Update Lesson PDFs"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'lesson-pdfs' AND public.check_is_admin() );

-- 4. Acceso de Borrado solo para Admin
CREATE POLICY "Admin Delete Lesson PDFs"
ON storage.objects FOR DELETE
USING ( bucket_id = 'lesson-pdfs' AND public.check_is_admin() );

COMMIT;
