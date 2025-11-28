# 🔓 Herramienta de Desbloqueo de Usuarios

Utilidad para desbloquear usuarios que han sido bloqueados por intentos fallidos de login.

## 📋 ¿Cuándo se bloquea un usuario?

Los usuarios se bloquean automáticamente cuando:

- Ingresan la contraseña incorrecta **5 veces consecutivas**
- El bloqueo dura **15 minutos** automáticamente
- Durante el bloqueo, no pueden iniciar sesión

## 🚀 Uso Rápido

### Windows (Doble clic):

1. Abre la carpeta: `backend/scripts/`
2. Haz doble clic en: `desbloquear-usuario.bat`
3. Sigue las instrucciones en pantalla

### Línea de comandos:

```bash
# Ir a la carpeta de scripts
cd backend/scripts

# Ver usuarios bloqueados
node desbloquear-usuario.js --list

# Desbloquear usuario específico
node desbloquear-usuario.js admin

# Desbloquear TODOS los usuarios
node desbloquear-usuario.js --all

# Limpiar bloqueos expirados
node desbloquear-usuario.js --clean

# Ver ayuda
node desbloquear-usuario.js --help
```

## 📖 Comandos Disponibles

### `--list` o `-l`

Lista todos los usuarios que están actualmente bloqueados.

```bash
node desbloquear-usuario.js --list
```

**Salida ejemplo:**

```
================================================================================
USUARIOS BLOQUEADOS
================================================================================

1. admin (Administrador Principal)
   Email: admin@tienda.com
   Intentos fallidos: 5
   Bloqueado hasta: 04/11/2025, 10:30:00
   Tiempo restante: 12 minutos
   Último acceso: 04/11/2025, 10:15:00

================================================================================
Total de usuarios bloqueados: 1
```

### `<username>`

Desbloquea un usuario específico por su nombre de usuario.

```bash
node desbloquear-usuario.js admin
```

**Salida ejemplo:**

```
✅ Usuario "admin" (Administrador Principal) desbloqueado exitosamente.
ℹ️  Intentos fallidos reseteados: 5 → 0
```

### `--all` o `-a`

Desbloquea **TODOS** los usuarios bloqueados.

```bash
node desbloquear-usuario.js --all
```

⚠️ **Advertencia:** Pedirá confirmación antes de ejecutar.

### `--clean` o `-c`

Limpia automáticamente los bloqueos que ya expiraron (más de 15 minutos).

```bash
node desbloquear-usuario.js --clean
```

## 🔍 Ejemplos de Uso

### Escenario 1: Revisar si hay usuarios bloqueados

```bash
node desbloquear-usuario.js --list
```

### Escenario 2: Usuario admin olvidó su contraseña y se bloqueó

```bash
# Ver si está bloqueado
node desbloquear-usuario.js --list

# Desbloquearlo
node desbloquear-usuario.js admin

# Verificar que se desbloqueó
node desbloquear-usuario.js --list
```

### Escenario 3: Múltiples usuarios bloqueados después de un ataque

```bash
# Ver cuántos hay
node desbloquear-usuario.js --list

# Desbloquear todos
node desbloquear-usuario.js --all
```

### Escenario 4: Mantenimiento diario

```bash
# Limpiar bloqueos viejos
node desbloquear-usuario.js --clean
```

## 💾 Ubicación de la Base de Datos

La herramienta busca automáticamente la base de datos en:

1. `backend/data/gestor_tienda.db`
2. `backend/data/mecanica.db`
3. `data/gestor_tienda.db`
4. `backend/data/gestor_tienda.db` (desde la raíz)

## 🛠️ Solución de Problemas

### Error: "No se encontró la base de datos"

**Solución:** Ejecuta el script desde la carpeta `backend/scripts/`:

```bash
cd backend/scripts
node desbloquear-usuario.js --list
```

### Error: "Usuario no encontrado"

**Causas posibles:**

1. El nombre de usuario está mal escrito (verifica mayúsculas/minúsculas)
2. El usuario no existe en la base de datos

**Solución:** Lista todos los usuarios bloqueados primero:

```bash
node desbloquear-usuario.js --list
```

### El usuario dice que sigue bloqueado después de desbloquearlo

**Soluciones:**

1. Verifica que se desbloqueó correctamente:

   ```bash
   node desbloquear-usuario.js --list
   ```

2. Limpia la caché del navegador (Ctrl+Shift+Del)

3. Reinicia el servidor backend:
   ```bash
   # En otra terminal
   cd backend
   npm run start
   ```

### La herramienta no funciona

**Verifica que Node.js está instalado:**

```bash
node --version
```

Deberías ver algo como: `v18.x.x` o superior.

## 🔐 Seguridad

- ✅ Esta herramienta **solo modifica** la tabla de usuarios
- ✅ **No** requiere contraseñas ni credenciales
- ✅ **No** elimina ni modifica otros datos
- ✅ Los cambios son **reversibles** (el usuario se puede volver a bloquear si falla el login)

## 📊 Información Técnica

### Campos modificados en la base de datos:

```sql
UPDATE usuarios SET
  intentos_fallidos = 0,        -- Resetea contador a 0
  bloqueado_hasta = NULL         -- Elimina fecha de bloqueo
WHERE username = ?
```

### Estructura de bloqueo:

- `intentos_fallidos`: Contador de intentos (0-5)
- `bloqueado_hasta`: Fecha/hora hasta la que está bloqueado (ISO 8601)
- Al llegar a 5 intentos → bloqueo de 15 minutos

## 🆘 Soporte

Si necesitas ayuda o encuentras un problema:

1. Verifica los logs del servidor backend
2. Revisa que la base de datos existe y no está corrupta
3. Asegúrate de tener permisos de escritura en la carpeta `data/`

---

**Versión:** 1.0.0  
**Fecha:** Noviembre 2025  
**Compatibilidad:** Windows, Linux, macOS
