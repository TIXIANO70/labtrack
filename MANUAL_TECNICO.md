# Manual Técnico — LabTrack

Sistema de gestión y seguimiento de incidencias de hardware para laboratorios de informática. Arquitectura monolítica modular basada en Node.js (ES Modules, `>=20.0.0`), Express 4, persistencia transaccional SQLite con soporte WAL vía better-sqlite3 y frontend React compilado con Vite.

## 1. Arquitectura y Estructura del Proyecto

```text
labtrack/
├── server/
│   ├── index.js                  # Bootstrap HTTP, timeouts (10s/30s) y graceful shutdown
│   ├── app.js                    # Factoría crearApp, middlewares de seguridad, CORS y estáticos
│   ├── config.js                 # Carga de .env, validación de puerto (1-65535) y resolución de paths
│   ├── db.js                     # Conexión better-sqlite3, pragmas (WAL, foreign_keys) y DDL
│   ├── models/incidencia.js      # Catálogos, enums, límites de caracteres y jerarquía AppError
│   ├── routes/incidencias.js     # Enrutador REST para /api/incidencias
│   ├── services/incidencias.js   # Reglas de negocio, transiciones, auditoría y exportación CSV
│   ├── repositories/             # Consultas preparadas SQL y transacciones atómicas
│   ├── controllers/              # Controladores y serialización de respuestas HTTP
│   └── middlewares/
│       ├── security.js           # Rate limiter en memoria y verificación de PIN administrativo
│       └── errorHandler.js       # Captura global de excepciones (400, 403, 404, 413, 429, 500)
├── client/
│   └── vite.config.js            # Configuración Vite (puerto 5173, proxy /api -> :3000)
├── data/labtrack.db              # Base de datos SQLite persistente
└── package.json                  # Definición de dependencias, engines (Node >=20) y scripts
```

## 2. Variables de Entorno y Configuración

El servidor procesa variables de entorno mediante `server/config.js` (`.env.example`):

| Variable | Tipo / Rango | Por defecto | Descripción |
| :--- | :--- | :--- | :--- |
| `PORT` | Entero (1–65535) | `3000` | Puerto TCP de escucha del servidor HTTP |
| `HOST` | String | `127.0.0.1` | Interfaz de red de enlace local |
| `DB_PATH` | String | `./data/labtrack.db` | Ruta al archivo SQLite local o `:memory:` para tests |
| `CORS_ORIGIN` | String (csv / `*`) | `http://localhost:5173` | Orígenes permitidos por CORS en desarrollo |
| `ADMIN_PIN` | String / Vacío | `""` (desactivado) | PIN para autorizar eliminación (`DELETE /api/incidencias/:id`) |
| `NODE_ENV` | Enum | `development` | Entorno de ejecución (`development`, `production`, `test`) |

## 3. Modelo de Persistencia (SQLite / better-sqlite3)

Inicializado en `server/db.js` aplicando pragmas: `journal_mode = WAL`, `foreign_keys = ON` y `busy_timeout = 5000` ms.

### 3.1. Esquema DDL e Índices
- **`incidencias`**: Registro principal de fallas de equipamiento.
  - Campos:
    - `id` (TEXT PRIMARY KEY): Identificador único (UUIDv4).
    - `puestoId` (TEXT NOT NULL): Identificador de puesto (máx. 40 caracteres, mayúsculas).
    - `componente` (TEXT NOT NULL CHECK): Componente de hardware reportado.
    - `sintoma` (TEXT NOT NULL): Descripción de la falla (máx. 1000 caracteres).
    - `prioridad` (TEXT NOT NULL DEFAULT 'MEDIA' CHECK): Nivel de urgencia asignado.
    - `estado` (TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK): Estado en el flujo de trabajo.
    - `tecnicoAsignado` (TEXT): Nombre del técnico responsable (máx. 80 caracteres).
    - `diagnosticoNotas` (TEXT): Bitácora técnica y observaciones (máx. 2000 caracteres).
    - `requiereRepuesto` (INTEGER NOT NULL DEFAULT 0 CHECK 0/1): Flag de necesidad de repuesto.
    - `fechaCreacion` (TEXT NOT NULL): Marca temporal ISO 8601 de creación.
    - `fechaResolucion` (TEXT): Marca temporal ISO 8601 calculada en estados terminales.
  - Índices: `idx_incidencias_estado`, `idx_incidencias_componente`, `idx_incidencias_puesto`, `idx_incidencias_prioridad_fecha` (`prioridad`, `fechaCreacion DESC`).
- **`historial_incidencias`**: Auditoría inmutable de transiciones y cambios.
  - Clave foránea: `FOREIGN KEY (incidenciaId) REFERENCES incidencias(id) ON DELETE CASCADE`.
  - Campos: `id` (INTEGER PK AUTOINCREMENT), `incidenciaId` (TEXT NOT NULL), `tipoEvento` (TEXT CHECK), `estadoAnterior` (TEXT), `estadoNuevo` (TEXT NOT NULL), `nota` (TEXT), `autor` (TEXT), `fecha` (TEXT NOT NULL).
  - Índice: `idx_historial_incidencia_fecha` (`incidenciaId`, `fecha ASC`, `id ASC`).

### 3.2. Catálogos y Reglas de Negocio
- **`COMPONENTES`**: `MOTHERBOARD`, `CPU`, `RAM`, `ALMACENAMIENTO`, `FUENTE_PODER`, `GPU`, `PERIFERICO`, `RED`, `OTRO`.
- **`PRIORIDADES`**: `BAJA`, `MEDIA`, `ALTA`, `CRITICA`.
- **`ESTADOS`**: Activos (`PENDIENTE`, `EN_DIAGNOSTICO`, `ESPERANDO_REPUESTO`) y Terminales (`RESUELTO`, `BAJA`).
- **`TIPOS_EVENTO`**: `CREACION`, `CAMBIO_ESTADO`, `DIAGNOSTICO`, `ACTUALIZACION`.
- **Transición de Estado**: Un equipo en `BAJA` no puede pasar directo a `RESUELTO`; debe reabrirse previamente a `PENDIENTE` o `EN_DIAGNOSTICO`.
- **Reincidencia**: Puestos con `>= 3` incidencias totales se marcan como reincidentes (`UMBRAL_REINCIDENCIA_PUESTO`).

## 4. Endpoints de la API REST (`/api`)

Rutas registradas en `server/routes/incidencias.js` y `server/app.js`:

| Método | Ruta | Control de Acceso / Límites | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Acceso público | Chequeo de estado HTTP y conectividad con la base SQLite |
| `GET` | `/api/incidencias` | Acceso público | Listado filtrado y paginado (cabecera `X-Total-Count`) |
| `GET` | `/api/incidencias/stats` | Acceso público | Métricas agregadas por estado (totales y activas) |
| `GET` | `/api/incidencias/puestos` | Acceso público | Agregado por puesto (`OPERATIVO`, `CON_FALLA`, `BAJA`) |
| `GET` | `/api/incidencias/export` | Rate Limit (120 req/min) | Exportación a CSV (límite: 10000 filas, BOM UTF-8) |
| `GET` | `/api/incidencias/:id` | Acceso público | Consulta de detalle con historial completo de eventos |
| `POST` | `/api/incidencias` | Rate Limit (120 req/min) | Alta de incidencia (asigna UUIDv4 y evento inicial `CREACION`) |
| `PATCH` | `/api/incidencias/:id` | Rate Limit (120 req/min) | Modificación de campos y registro en `historial_incidencias` |
| `DELETE` | `/api/incidencias/:id` | Rate Limit + `ADMIN_PIN` | Baja física en cascada. Exige cabecera `x-admin-pin` si está configurado |

## 5. Seguridad, Límites Operacionales y Manejo de Errores

- **Límite de Carga Útil**: `express.json({ limit: '256kb' })`. Cuerpos mayores responden `HTTP 413` (`entity.too.large`).
- **Límites de Longitud (`LIMITES_CAMPO`)**: `puestoId` (40), `sintoma` (1000), `tecnicoAsignado` (80), `diagnosticoNotas` (2000), `busqueda` (100), `id` (100).
- **Protección de Tasa (Rate Limiting)**: `crearRateLimiter` restringe a `120` peticiones por minuto por IP (`HTTP 429` con cabecera `Retry-After`). Limpieza automática en memoria al superar 1000 registros.
- **Protección Administrativa**: `crearGuardiaPinAdmin` compara `x-admin-pin` contra `ADMIN_PIN` mediante `crypto.timingSafeEqual` (`HTTP 403`).
- **Cabeceras HTTP de Seguridad (`crearMiddlewareSeguridadYLogs`)**:
  - `Content-Security-Policy`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`
  - Políticas: `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`.
  - Caché: `Cache-Control: no-store` para `/api/*`. `x-powered-by` deshabilitado.
- **Timeouts HTTP y Shutdown**: `headersTimeout = 10000` ms, `requestTimeout = 30000` ms. Cierre ordenado por `SIGINT`/`SIGTERM` con timeout forzado de 5000 ms.
- **Mapeo Centralizado de Errores**: `errorHandler.js` gestiona `ValidationError` (400), `NotFoundError` (404), `URIError` (400), JSON inválido (400) y `AppError` operacional.

## 6. Comandos del Ciclo de Vida

Comandos configurados en `package.json` para Node.js `>=20.0.0`:

| Comando | Script Ejecutado | Propósito |
| :--- | :--- | :--- |
| `npm start` | `node server/index.js` | Inicia servidor HTTP de producción y sirve estáticos de `client/dist` |
| `npm run dev` | `concurrently "npm run dev:server" "npm run dev:client"` | Inicia en simultáneo backend Express y frontend Vite |
| `npm run dev:server` | `node --watch server/index.js` | Inicia backend Express en modo observador con recarga automática |
| `npm run dev:client` | `npm --prefix client run dev` | Inicia servidor de desarrollo Vite en puerto 5173 |
| `npm run build` | `npm --prefix client run build` | Compila frontend React para producción en `client/dist` |
| `npm run seed` | `node server/seed.js` | Carga lote inicial de datos sintéticos en SQLite para pruebas |
| `npm test` | `npm run test:server && npm run test:client` | Ejecuta suite integral de pruebas (Node test runner + Vitest/jsdom) |
| `npm run lint` | `eslint server client/src` | Ejecuta análisis estático con ESLint sobre backend y frontend |
