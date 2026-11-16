# LabTrack – Especificación Técnica de Proyecto (SPEC)

> **Autor:** Tiziano Espinoza (`TIXIANO70`)  
> **Estado:** Implementado y Verificado  
> **Arquitectura:** Monolito desacoplado (Express ESM + SQLite `better-sqlite3` + React 18 SPA)

---

## 1. Objetivo del Proyecto

Proveer una solución web ligera, modular y de despliegue local autónomo para centralizar el registro, diagnóstico y ciclo de vida de fallas de hardware en las computadoras de laboratorios educativos y talleres técnicos, garantizando persistencia relacional local (ACID) y operación 100% offline en redes LAN.

---

## 2. Usuarios Objetivo

- **Técnicos de Soporte y Administradores de Laboratorio:** Diagnóstico de fallas, sustitución de componentes, registro de intervenciones y actualización del estado de las máquinas.
- **Docentes y Jefes de Taller:** Reporte rápido de puestos inoperativos y consulta de disponibilidad de equipos previo a las clases prácticas.

---

## 3. Modelo de Datos Relacional (`incidencias`)

```sql
CREATE TABLE IF NOT EXISTS incidencias (
    id TEXT PRIMARY KEY,
    puestoId TEXT NOT NULL,
    componente TEXT NOT NULL CHECK (componente IN (
        'MOTHERBOARD', 'CPU', 'RAM', 'ALMACENAMIENTO', 
        'FUENTE_PODER', 'GPU', 'PERIFERICO', 'RED', 'OTRO'
    )),
    sintoma TEXT NOT NULL,
    prioridad TEXT NOT NULL DEFAULT 'MEDIA' CHECK (prioridad IN (
        'BAJA', 'MEDIA', 'ALTA', 'CRITICA'
    )),
    estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN (
        'PENDIENTE', 'EN_DIAGNOSTICO', 'ESPERANDO_REPUESTO', 'RESUELTO', 'BAJA'
    )),
    tecnicoAsignado TEXT,
    diagnosticoNotas TEXT,
    requiereRepuesto INTEGER NOT NULL DEFAULT 0,
    fechaCreacion TEXT NOT NULL,
    fechaResolucion TEXT
);
```

---

## 4. Contrato de Endpoints REST

Todas las respuestas del servidor deben retornar formato JSON con la siguiente estructura normalizada:
`{ "success": boolean, "data"?: any, "error"?: string }`

| Método | Endpoint | Descripción | Códigos HTTP |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Verifica disponibilidad de API y conexión SQLite. | `200`, `503` |
| `GET` | `/api/incidencias` | Lista incidencias con soporte de filtros (`puestoId`, `estado`, `componente`, `prioridad`, `q`, `soloRepuestos`, `soloActivas`, `limit`, `offset`). | `200`, `400` |
| `GET` | `/api/incidencias/stats` | Métricas agregadas de salud y cola de repuestos. | `200` |
| `GET` | `/api/incidencias/puestos` | Estado operativo y reincidencia agrupada por puesto físico. | `200` |
| `GET` | `/api/incidencias/export` | Exportación CSV segura (RFC 4180 + BOM UTF-8). | `200`, `400` |
| `GET` | `/api/incidencias/:id` | Obtiene el detalle de un ticket específico y su bitácora. | `200`, `404` |
| `POST` | `/api/incidencias` | Registra una nueva falla (valida campos obligatorios). | `201`, `400` |
| `PATCH` | `/api/incidencias/:id` | Actualiza estado, notas técnicas y repuestos. Si pasa a `RESUELTO` o `BAJA`, asigna `fechaResolucion`. | `200`, `400`, `404` |
| `DELETE` | `/api/incidencias/:id` | Elimina un ticket erróneo (con guardia opcional `ADMIN_PIN` en header `x-admin-pin`). | `200`, `403`, `404` |

---

## 5. Estructura de Directorios

```text
labtrack/
├── package.json
├── eslint.config.js
├── .env.example
├── SPEC.md
├── README.md
├── .gitignore
├── data/
│   └── labtrack.db            # Base de datos SQLite local (excluida de git)
├── server/
│   ├── index.js               # Punto de entrada HTTP + cierre graceful
│   ├── app.js                 # Express ESM, cabeceras CSP/seguridad y SPA static
│   ├── config.js              # Carga de .env opcional y validación de puerto/CORS
│   ├── db.js                  # Inicialización, pragmas WAL/FK y DDL SQLite
│   ├── seed.js                # Script CLI idempotente de muestra
│   ├── utils/
│   │   └── validacion.js      # Validadores de dominio y escape CSV
│   ├── models/
│   │   └── incidencia.js      # Catálogos, límites y errores operacionales
│   ├── repositories/
│   │   └── incidenciaRepository.js # Queries preparadas y transacciones ACID
│   ├── routes/
│   │   └── incidencias.js     # Router REST
│   ├── controllers/
│   │   └── incidencias.js     # Controladores HTTP
│   ├── services/
│   │   └── incidencias.js     # Lógica de negocio y bitácora
│   ├── middlewares/
│   │   ├── errorHandler.js    # Manejo centralizado de excepciones
│   │   └── security.js        # Rate limiter y guardia PIN opcional
│   └── tests/
│       └── incidencias.test.js
└── client/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── hooks/
        │   └── useLabTrack.js
        ├── constants/
        │   └── catalogos.js
        ├── styles/
        │   └── app.css
        ├── components/
        │   ├── StatCards.jsx
        │   ├── IncidenciaForm.jsx
        │   ├── IncidenciaFilter.jsx
        │   ├── IncidenciaList.jsx
        │   ├── PuestosGrid.jsx
        │   ├── IncidenciaDetailModal.jsx
        │   └── HistorialTimeline.jsx
        ├── services/
        │   └── api.js         # Cliente HTTP fetch nativo
        └── __tests__/
            └── App.test.jsx
```

---

## 6. Principios y Restricciones Técnicas

1. **Backend-First:** Toda la validación de esquemas y lógica de negocio se ejecuta en el servidor.
2. **Consultas Parametrizadas:** Uso obligatorio de `db.prepare()` para evitar inyección SQL.
3. **Persistencia Real:** No se permite mockear datos en memoria; las operaciones deben escribirse en SQLite.
4. **Nomenclatura:** `camelCase` para variables, funciones y atributos de entidades.
5. **Autonomía LAN:** Sin dependencias de CDNs externos ni servicios cloud obligatorios.
