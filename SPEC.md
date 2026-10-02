# LabTrack – Especificación Técnica de Proyecto (SPEC)

> **Autor:** Tiziano Espinoza (`TIXIANO70`)  
> **Estado:** Fase de Diseño / Scaffolding Inicial  
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
| `GET` | `/api/incidencias` | Lista incidencias con soporte de filtros (`puestoId`, `estado`, `componente`, `prioridad`). | `200` |
| `GET` | `/api/incidencias/:id` | Obtiene el detalle de un ticket específico. | `200`, `404` |
| `POST` | `/api/incidencias` | Registra una nueva falla (valida campos obligatorios). | `201`, `400` |
| `PATCH` | `/api/incidencias/:id` | Actualiza estado, notas técnicas y repuestos. Si pasa a `RESUELTO`, asigna `fechaResolucion`. | `200`, `400`, `404` |
| `DELETE` | `/api/incidencias/:id` | Da de baja o elimina un ticket erróneo de la base de datos. | `200`, `404` |

---

## 5. Estructura de Directorios

```text
labtrack/
├── package.json
├── SPEC.md
├── README.md
├── .gitignore
├── data/
│   └── labtrack.db            # Base de datos SQLite local (excluida de git)
├── server/
│   ├── index.js               # Punto de entrada Express ESM
│   ├── db.js                  # Inicialización y DDL de SQLite
│   ├── routes/
│   │   └── incidencias.js     # Router REST
│   ├── controllers/
│   │   └── incidencias.js     # Controladores HTTP
│   ├── services/
│   │   └── incidencias.js     # Lógica de negocio y queries preparadas
│   └── middlewares/
│       └── errorHandler.js    # Manejo centralizado de excepciones
└── client/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── components/
        │   ├── IncidenciaForm.jsx
        │   ├── IncidenciaList.jsx
        │   ├── IncidenciaFilter.jsx
        │   └── StatCards.jsx
        └── services/
            └── api.js         # Cliente HTTP fetch nativo
```

---

## 6. Principios y Restricciones Técnicas

1. **Backend-First:** Toda la validación de esquemas y lógica de negocio se ejecuta en el servidor.
2. **Consultas Parametrizadas:** Uso obligatorio de `db.prepare()` para evitar inyección SQL.
3. **Persistencia Real:** No se permite mockear datos en memoria; las operaciones deben escribirse en SQLite.
4. **Nomenclatura:** `camelCase` para variables, funciones y atributos de entidades.
5. **Autonomía LAN:** Sin dependencias de CDNs externos ni servicios cloud obligatorios.
