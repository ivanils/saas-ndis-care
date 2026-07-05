# TODO — Mejoras pendientes

## Registro de agencia — transaccionalidad completa (Opción B)

**Contexto:** el hallazgo #3 del informe de auditoría identificó que el flujo
`POST /auth/register` no es atómico porque combina una llamada a Supabase Auth
(GoTrue, fuera de Postgres) con dos escrituras en la base de datos (agencies,
profiles). El fix aplicado en `fix/atomic-registration-and-shift-status` usa
reordenamiento y compensating transactions, que reducen el riesgo pero no son
100% bulletproof si el cleanup también falla.

**Mejora futura (Opción B):** mover los dos pasos de base de datos (INSERT en
`agencies` y UPSERT en `profiles`, más el UPDATE en `auth.users` para
app_metadata) a una función PL/pgSQL invocada vía `supabase_admin.rpc()`. Esto
haría que los tres pasos de DB corran en un único `BEGIN/COMMIT`, eliminando el
riesgo de agencia huérfana o perfil faltante entre ellos. Supabase Auth
(`sign_up`) seguiría siendo el único paso fuera de la transacción, pero el
scope del problema se reduce drásticamente.

**Requiere:** nueva migración SQL (crear la función RPC). Aprobación explícita
antes de implementar.
