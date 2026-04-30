-- ==========================================
-- POLÍTICAS PARA EL BUCKET: avatars (Público)
-- ==========================================

-- 1. Permitir que cualquier persona (incluso sin login) pueda VER las fotos de perfil
CREATE POLICY "Public Access to Avatars"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- 2. Permitir que solo los usuarios logueados puedan SUBIR fotos
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' );

-- 3. Permitir que los usuarios puedan actualizar o borrar fotos existentes
CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'avatars' );

CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'avatars' );


-- ==========================================
-- POLÍTICAS PARA EL BUCKET: clinical-vault (Privado)
-- ==========================================

-- 1. Solo los usuarios con un Token válido (logueados) pueden VER los archivos clínicos
CREATE POLICY "Authenticated users can view clinical files"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'clinical-vault' );

-- 2. Solo los usuarios logueados pueden SUBIR archivos médicos
CREATE POLICY "Authenticated users can upload clinical files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'clinical-vault' );

-- 3. Las notas clínicas (auditoría médica) no deberían borrarse, 
-- pero permitimos actualizar por si hay un error en la carga inicial.
CREATE POLICY "Authenticated users can update clinical files"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'clinical-vault' );