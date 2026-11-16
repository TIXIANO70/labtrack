# LabTrack

> **Sistema de Gestión y Seguimiento de Incidencias de Hardware para Laboratorios Técnicos.**  
> *Hardware Incident & Maintenance Management System for Computer Labs.*

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](#)
[![Stack: Express + SQLite + React](https://img.shields.io/badge/Stack-Express%20%7C%20SQLite%20%7C%20React%2018-blue.svg)](#)
[![Status: Production Ready](https://img.shields.io/badge/Status-Active-brightgreen.svg)](#)

---

## Descripción en Español

**LabTrack** es una aplicación web ligera, modular y autónoma pensada para entornos educativos técnicos y talleres de informática. Reemplaza planillas en papel y notas adhesivas por un flujo de trabajo digital, auditable y 100 % operativo en redes LAN sin depender de Internet ni de CDNs externos.

### Funcionalidades Principales
- **Registro de Incidencias (`POST /api/incidencias`):** Alta por puesto físico (`LAB1-PC08`), componente, prioridad, síntoma y alerta preventiva en interfaz ante tickets activos duplicados para el mismo puesto y componente.
- **Ciclo de Vida y Bitácora (`PATCH /api/incidencias/:id`):** Transiciones validadas (`PENDIENTE` -> `EN_DIAGNOSTICO` -> `ESPERANDO_REPUESTO` -> `RESUELTO` / `BAJA`), cálculo automático de `fechaResolucion` e historial cronológico persistido en `historial_incidencias`.
- **Tablero Reactivo, Filtros y Mapa de Puestos:** Búsqueda instantánea multicriterio (`q`, `puestoId`, `estado`, `componente`, `prioridad`, cola de repuestos), tarjetas KPI interactivas y vista de estado por puesto con detección automática de equipos reincidentes (`>= 3` incidencias).
- **Exportación CSV Segura (`GET /api/incidencias/export`):** Generación RFC 4180 con neutralización ante inyección de fórmulas en hojas de cálculo.
- **Persistencia Local ACID:** SQLite vía `better-sqlite3` (`./data/labtrack.db`, modo WAL y llaves foráneas activas).
- **Despliegue Autónomo LAN:** Express sirve directamente `client/dist/` en un único puerto cuando existe build de producción.

### Arquitectura
- **Backend:** Node.js >= 20 + Express ESM + SQLite (`better-sqlite3`).
- **Frontend:** React 18 + Vite (SPA offline-first con tema oscuro técnico).
- **Capas del servidor:** `routes -> controllers -> services -> repositories -> SQLite db` + `middlewares/errorHandler`.

---

## English Description

**LabTrack** is a lightweight, modular, self-hosted web application tailored for technical schools and IT labs. It replaces paper logs and sticky notes with a structured, auditable maintenance workflow designed for isolated LAN environments with zero external CDN or cloud dependencies.

### Key Features
- **Incident Intake & Duplicate Prevention:** Map failures to physical stations (`LAB1-PC08`), hardware category, severity, and spare-part needs with active duplicate warnings in the UI.
- **Auditable Lifecycle & Timeline:** Validated transitions (`PENDIENTE` -> `EN_DIAGNOSTICO` -> `ESPERANDO_REPUESTO` -> `RESUELTO` / `BAJA`), automatic `fechaResolucion` timestamping, and chronological event logging in `historial_incidencias`.
- **Reactive Workbench & Station Health Grid:** Multi-criteria filtering, interactive KPI summary cards, spares queue filter, and a machine health grid highlighting chronic stations (`>= 3` incidents).
- **Safe CSV Export:** RFC 4180 export protected against CSV formula injection.
- **Local ACID Persistence:** Embedded SQLite (`better-sqlite3`) stored in `./data/labtrack.db` with WAL journaling enabled.
- **Single-Server LAN Ready:** Express automatically serves compiled assets from `client/dist/` when built.

---

## Instalación y Uso / Setup & Usage

1. **Instalar dependencias / Install dependencies:**
   ```bash
   npm install
   npm --prefix client install
   ```

2. **Configurar variables opcionales / Optional environment config:**
   ```bash
   cp .env.example .env
   ```
   Variables soportadas (con defaults seguros si no existe `.env`):
   - `PORT` (default `3000`)
   - `HOST` (default `127.0.0.1`; usar `0.0.0.0` para exponer en LAN)
   - `DB_PATH` (default `./data/labtrack.db`)
   - `CORS_ORIGIN` (default `http://localhost:5173,http://127.0.0.1:5173`)
   - `ADMIN_PIN` (opcional; exige cabecera `x-admin-pin` en `DELETE /api/incidencias/:id` si se define)
   - `NODE_ENV` (`development` | `production` | `test`)

3. **Cargar datos de muestra opcionales / Optional seed data:**
   ```bash
   npm run seed
   ```

4. **Ejecutar en desarrollo / Run in development:**
   ```bash
   npm run dev
   ```

5. **Compilar y servir en producción LAN / Build & run in production:**
   ```bash
   npm run build
   npm start
   ```

6. **Ejecutar tests y linter / Run tests & linter:**
   ```bash
   npm test
   npm run lint
   ```

---

## Endpoints REST

Todas las respuestas JSON siguen el contrato `{ "success": boolean, "data"?: any, "error"?: string }`.

- `GET /api/health` — Verifica el estado del servidor HTTP y la conexión SQLite.
- `GET /api/incidencias` — Lista incidencias con filtros opcionales (`puestoId`, `estado`, `componente`, `prioridad`, `q`, `soloRepuestos`, `limit`, `offset`).
- `GET /api/incidencias/stats` — Resumen agregado de métricas del laboratorio.
- `GET /api/incidencias/puestos` — Mapa agrupado por puesto con estado operativo y flag de reincidencia.
- `GET /api/incidencias/export` — Descarga CSV de los tickets filtrados.
- `GET /api/incidencias/:id` — Detalle de ticket e historial cronológico de eventos.
- `POST /api/incidencias` — Registra una nueva incidencia.
- `PATCH /api/incidencias/:id` — Actualiza estado, prioridad, técnico, repuesto y diagnóstico.
- `DELETE /api/incidencias/:id` — Elimina un registro erróneo.

---

## Estructura del Proyecto / Project Structure

```text
labtrack/
├── package.json
├── eslint.config.js
├── .env.example
├── SPEC.md
├── README.md
├── .gitignore
├── data/                              # SQLite local database (git-ignored)
├── server/                            # Express ESM REST API
│   ├── index.js
│   ├── app.js
│   ├── config.js
│   ├── db.js
│   ├── seed.js
│   ├── routes/incidencias.js
│   ├── controllers/incidencias.js
│   ├── services/incidencias.js
│   ├── repositories/incidenciaRepository.js
│   ├── models/incidencia.js
│   ├── middlewares/errorHandler.js
│   └── tests/incidencias.test.js
└── client/                            # React 18 + Vite SPA
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── constants/catalogos.js
        ├── services/api.js
        ├── styles/app.css
        ├── components/
        │   ├── StatCards.jsx
        │   ├── IncidenciaForm.jsx
        │   ├── IncidenciaFilter.jsx
        │   ├── IncidenciaList.jsx
        │   ├── PuestosGrid.jsx
        │   └── IncidenciaDetailModal.jsx
        └── __tests__/App.test.jsx
```

---

## Documentación / Documentation

- [Manual de Uso (MANUAL_DE_USUARIO.md)](./MANUAL_DE_USUARIO.md)
- [Manual Técnico (MANUAL_TECNICO.md)](./MANUAL_TECNICO.md)
- [Especificación Técnica (SPEC.md)](./SPEC.md)

---

## Autor / Author

- **Tiziano Espinoza** ([@TIXIANO70](https://github.com/TIXIANO70))  
  *Técnico en Computación & Full Stack Developer*
