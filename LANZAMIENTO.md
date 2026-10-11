# Guía de Lanzamiento a Producción — LAZO (VLB Studio · Planning)

La aplicación **LAZO — VLB STUDIO · PLANNING** se encuentra compilada y lista para producción (sin botones de demo/QA en el Login ni en la barra superior).

---

## 1. Credenciales Iniciales de Acceso

Como ya se retiraron los botones de prueba del Login para que ningún cliente los vea, puedes ingresar directamente con tu cuenta de **Administradora**:

- **Correo**: `admin@vlb.studio`
- **Contraseña inicial**: `admin123`

> **Primer paso al lanzar**: Entra a **Dashboard General VLB → Usuarios y Roles**, haz clic en **Editar** sobre tu usuario (`Valeria Lozano`) y actualiza tu correo real y tu contraseña definitiva. Desde esa misma pestaña puedes crear las cuentas reales de tu equipo (`COORDINADOR`, `STAFF`) y de los `NOVIOS` de cada boda.

*(Si en algún momento necesitas probar las cuentas semilla desde el Login manual: Coordinadora `coordinador@vlb.studio` / `coord123`, Staff `staff@vlb.studio` / `staff123`, Novios `novios.sofia@vlb.studio` / `novios123`).*

---

## 2. Cómo Publicar LAZO en Internet (Paso a Paso)

El proyecto ya incluye [`Dockerfile`](./Dockerfile), [`railway.json`](./railway.json), [`render.yaml`](./render.yaml) y [`.gitignore`](./.gitignore).

### Opción A: Publicar en Railway.app (Recomendado — 5 minutos)
1. Sube esta carpeta (`/Users/scarletteolivo/.gemini/antigravity/scratch/lazo-vlb-studio`) a un repositorio **privado** en tu cuenta de **GitHub**.
2. Entra a [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** y selecciona tu repositorio de `lazo-vlb-studio`.
3. **Configurar Disco Persistente (Importante para que no se borren datos ni PDFs)**:
   - Haz clic derecho sobre el servicio en Railway → **Add Volume**.
   - En **Mount Path** escribe exactamente: `/app/data`
4. **Variables de Entorno** (pestaña **Variables** del servicio):
   - `NODE_ENV` = `production`
   - `PORT` = `3001`
   - `JWT_SECRET` = *(escribe una frase secreta larga y única)*
5. **Conectar tu Dominio**:
   - En la pestaña **Settings → Networking → Custom Domain**, escribe tu dominio (por ejemplo `lazo.vlbstudio.com`) y copia el registro `CNAME` que te da Railway en tu proveedor de dominio (GoDaddy, Cloudflare, Hostinger, etc.). Railway activará el candado de seguridad **HTTPS / SSL** automáticamente.

### Opción B: Publicar en Render.com
1. Sube el proyecto a un repositorio privado en GitHub.
2. En [render.com](https://render.com), elige **New → Blueprint** y selecciona tu repositorio.
3. Render detectará automáticamente el archivo [`render.yaml`](./render.yaml), el cual ya configura el contenedor Docker, el disco persistente de `5 GB` en `/app/data` y la llave `JWT_SECRET` automática.
