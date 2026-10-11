# LAZO — VLB STUDIO · PLANNING

Plataforma integral, privada y funcional para la administración y operación de bodas de **VLB Studio**.

---

## 💎 Identidad y Arquitectura

- **Nombre:** LAZO — VLB STUDIO · PLANNING
- **Frontend:** React 19 + TypeScript + Tailwind CSS (v4) + Lucide Icons + Canvas Visual Drag & Drop
- **Backend:** Node.js (v24) + Express 5 + TypeScript + SQLite nativo (`node:sqlite`) con transacciones y modo WAL
- **Persistencia:** Base de datos centralizada en disco (`data/lazo.db`)
- **Almacenamiento Privado:** Archivos (`data/uploads`) protegidos mediante streaming autenticado con control RBAC estricto
- **Seguridad:** Aislamiento absoluto entre bodas en backend, hash bcrypt, sesiones JWT con cookies HTTP-only, auditoría inmutable (`audit_logs`)

---

## 🛡️ Roles y Credenciales de Prueba (QA Demo)

Todas las cuentas demo están configuradas y listas para probar:

| Rol | Usuario | Correo Electrónico | Contraseña | Alcance / Permisos |
|---|---|---|---|---|
| **ADMINISTRADOR** | Valeria Lozano (VLB Director) | `admin@vlb.studio` | `admin123` | Acceso global a todas las bodas, creación de proyectos, asignación de equipo, catálogos y bitácora completa. |
| **COORDINADOR** | Mariana Morales (Coord. Senior) | `coordinador@vlb.studio` | `coord123` | Acceso únicamente a sus bodas asignadas (Boda QA A: Sofía & Alejandro). Permisos operativos completos. |
| **COORDINADOR B** | Carla Méndez | `carla@vlb.studio` | `coord123` | Asignada únicamente a Boda B (Valeria & Mateo). Intentar acceder a Boda A devuelve `403 Forbidden`. |
| **STAFF** | Diego Salazar | `staff@vlb.studio` | `staff123` | Acceso operativo en campo día B únicamente en bodas asignadas (Invitados, Timeline, Checklist). |
| **NOVIOS (Boda A)** | Sofía Villaseñor | `novios.sofia@vlb.studio` | `novios123` | Acceso **exclusivo** a su boda. Puede solicitar reuniones, confirmar invitados, ver mesas (faltan 180 días). |
| **NOVIOS (Boda B)** | Valeria Domínguez | `novios.valeria@vlb.studio` | `novios123` | Boda programada a menos de 5 días. **Candado de 5 días activo**: no puede editar mesas ni layout. |

*Nota:* La interfaz cuenta con un selector de rol rápido en la barra superior para alternar entre roles con un solo clic.

---

## 🏛️ Principio Central: Capturar una vez, reutilizar en toda la plataforma

1. **Proveedores y Ubicaciones:**
   - Un proveedor registrado en **Proveedores y Pagos** con la ubicación `CIVIL` se refleja **automáticamente** en el módulo **Civil** sin duplicar información.
   - Un proveedor con la ubicación `IGLESIA` se refleja **automáticamente** en **Ceremonia Religiosa**.
2. **Invitados y Confirmaciones (Módulo Único):**
   - Una única tabla operativa: `NOMBRE`, `APELLIDO`, `WHATSAPP`, `# ACOMPAÑANTES`, `ESTATUS`, `MESA`, `OBSERVACIONES`.
   - Cambio de estatus inline: Si un invitado cambia a *"No asistirá"*, los lugares en la mesa se liberan de inmediato en la base de datos (contemplando acompañantes: $1 + \text{acompañantes}$).
3. **Control Financiero:**
   - Métricas estrictas: **COSTO REAL**, **MONTO PAGADO**, **SALDO RESTANTE**.
   - No se utiliza presupuesto estimado ni comparativas ficticias.
4. **Candado de 5 Días en Mesas:**
   - A 5 días o menos de la boda, los novios tienen bloqueada la modificación de mesas y layout tanto en interfaz como verificado en backend (`403 Forbidden`). El Administrador y Coordinador mantienen el control operativo.

---

## 🚀 Puesta en Marcha

### Prerrequisitos
- Node.js >= 22.5 (incluye `node:sqlite` nativo)

### Comandos Principales
```bash
# Instalar dependencias
npm install

# Compilar frontend y backend
npm run build

# Iniciar servidor en producción (http://localhost:3001)
npm start

# Modo desarrollo con recarga en vivo
npm run dev

# Ejecutar suite de pruebas automatizadas
npm test
```

---

## 🧪 Pruebas Automatizadas Verificadas

Se cuenta con una suite completa de pruebas ejecutada con `node --test`:
1. `Autenticación`: Verificación de credenciales correctas y rechazo de erróneas.
2. `Aislamiento estricto entre bodas`: Novios A rechazados en Boda B (`403`), Coordinador no asignado rechazado en Boda A (`403`), Staff rechazado en bodas ajenas (`403`).
3. `Invitados y Capacidad`: Conteo exacto de lugares ($1 + \text{acompañantes}$), búsqueda insensible a acentos y persistencia en SQLite.
4. `Liberación de Mesas`: Regla estricta de desasignación automática (`table_id = null`) al marcar *"No asistirá"*.
5. `Candado de 5 Días`: Bloqueo en backend para novios a $\le 5$ días del evento; permisos mantenidos para Administrador.
6. `Reutilización de Proveedores`: Inclusión automática en Civil e Iglesia según etiqueta.
7. `Resumen Financiero`: Costo Real, Pagado y Restante sin campos eliminados.
8. `Reportes en Tiempo Real`: Agregaciones en vivo consolidadas.

---

## 💾 Respaldo y Recuperación (Disaster Recovery)

- **Descarga de Backup:** El Administrador puede generar un respaldo completo de la base de datos desde el botón de backup en la interfaz o vía `POST /api/admin/backup`.
- **Archivos Físicos:** Se encuentran resguardados en `data/uploads/` con metadatos asociados en SQLite.
