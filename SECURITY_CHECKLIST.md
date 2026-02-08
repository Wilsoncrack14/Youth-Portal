# 🔒 Checklist de Seguridad - Youth Portal

## 🔴 CRÍTICO - Completar HOY

### Paso 1: Rotar Claves API
- [x] Rotar clave Supabase Anon en Dashboard ✅
- [ ] Rotar clave GROQ en console.groq.com
- [ ] Rotar clave Bible API
- [ ] Configurar nuevas claves en Vercel: `vercel env add`
- [x] Configurar GROQ en Supabase: `npx supabase secrets set` ✅
- [x] Actualizar `.env` local (NO commitear) ✅

### Paso 2: Limpiar Git History
- [ ] Instalar BFG: `choco install bfg`
- [ ] Crear respaldo del repositorio
- [ ] Clonar como espejo: `git clone --mirror`
- [ ] Ejecutar BFG: `bfg --delete-files .env`
- [ ] Limpiar referencias: `git reflog expire` + `git gc`
- [ ] Push forzado: `git push --force`
- [ ] Verificar limpieza: `git log --all -- .env`

### Paso 3: Implementar RLS
- [ ] Aplicar migración: `npx supabase db push`
- [ ] Verificar en SQL Editor que RLS está habilitado
- [ ] Probar políticas con queries de prueba
- [ ] Verificar que usuarios no pueden modificar datos ajenos

### Paso 4: Corregir CORS
- [ ] Actualizar `mistral-chat/index.ts` (ya modificado ✅)
- [ ] Configurar `ALLOWED_ORIGINS`: `npx supabase secrets set`
- [ ] Desplegar función: `npx supabase functions deploy mistral-chat`
- [ ] Probar desde origen permitido (debe funcionar)
- [ ] Probar desde origen no permitido (debe fallar)

### Paso 5: Verificación JWT
- [ ] Agregar import de `@supabase/supabase-js`
- [ ] Implementar verificación de token
- [ ] Configurar variables de entorno
- [ ] Desplegar función actualizada
- [ ] Probar sin token (debe retornar 401)
- [ ] Probar con token válido (debe funcionar)

---

## 🟠 ALTA - Completar Esta Semana

- [ ] Implementar rate limiting con Upstash Redis
- [ ] Agregar security headers en `vercel.json`
- [ ] Instalar y usar DOMPurify para sanitizar HTML
- [ ] Habilitar MFA para cuentas admin
- [ ] Configurar session timeout (1 hora)

---

## 🟡 MEDIA - Completar Este Mes

- [ ] Agregar validación con Zod
- [ ] Implementar audit logging
- [ ] Configurar Sentry para monitoreo
- [ ] Crear error boundaries en React

---

## 🟢 BAJA - Mantenimiento Continuo

- [ ] Configurar GitHub Actions para security scanning
- [ ] Habilitar Dependabot
- [ ] Auditorías de seguridad trimestrales
- [ ] Actualizar dependencias regularmente

---

## ✅ Verificación Final

Antes de marcar como completo, verificar:

- [ ] Todas las claves antiguas NO funcionan
- [ ] `.env` no aparece en `git log`
- [ ] RLS bloquea acceso no autorizado
- [ ] CORS solo permite orígenes específicos
- [ ] Edge Functions requieren autenticación
- [ ] No hay errores en producción
- [ ] Logs de Supabase sin errores RLS

---

**Última actualización:** 2026-02-06  
**Estado actual:** 🔴 CRÍTICO - Requiere acción inmediata
