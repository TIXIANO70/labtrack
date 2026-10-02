# 🛠️ LabTrack

> **Sistema de Gestión y Seguimiento de Incidencias de Hardware para Laboratorios Técnicos.**  
> *Hardware Incident & Maintenance Management System for Computer Labs.*

[![License: Proprietary](https://img.shields.io/badge/License-Private-red.svg)](#)
[![Stack: Express + SQLite + React](https://img.shields.io/badge/Stack-Node.js%20%7C%20SQLite%20%7C%20React-blue.svg)](#)
[![Status: Scaffolding](https://img.shields.io/badge/Status-Scaffolding%20%2F%20In%20Design-yellow.svg)](#)

---

## 🇪🇸 Descripción en Español

**LabTrack** es una solución web ligera, modular y autónoma diseñada para entornos educativos técnicos y talleres de informática. Su objetivo es transformar la gestión precaria de fallas de computadoras (planillas en papel, notas adhesivas) en un flujo de trabajo digital, estructurado y auditable.

### Características Principales
- **Registro Rápido de Tickets:** Asociación directa por puesto físico (`LAB1-PC04`), componente afectado y severidad.
- **Ciclo de Vida Auditable:** Transiciones de estado (`PENDIENTE` $\rightarrow$ `EN_DIAGNOSTICO` $\rightarrow$ `ESPERANDO_REPUESTO` $\rightarrow$ `RESUELTO` $\rightarrow$ `BAJA`) con registro de diagnóstico y marcas de tiempo ISO 8601.
- **Persistencia Local ACID:** Almacenamiento en archivo SQLite local (`./data/labtrack.db`) con transacciones seguras y sin requerir motores pesados.
- **Autonomía LAN (Offline-First):** Diseñado para operar en redes de laboratorios escolares sin salida a Internet.
- **Frontend SPA Reactivo:** Tablero con búsqueda instantánea, filtros combinados y métricas rápidas de disponibilidad.

### Arquitectura
- **Backend:** Node.js + Express (módulos ESM nativos).
- **Base de Datos:** SQLite vía `better-sqlite3`.
- **Frontend:** React 18 + Vite (SPA con soporte nativo de tema oscuro).

---

## 🇬🇧 English Description

**LabTrack** is a lightweight, modular, and self-hosted web application tailored for technical education and IT computer labs. It aims to replace chaotic paper-based logs and sticky notes with a structured, auditable digital workflow for hardware repairs and diagnostics.

### Key Features
- **Quick Incident Intake:** Map tickets directly to physical lab stations (`LAB1-PC04`), component category, and priority.
- **Auditable Lifecycle:** State transitions (`PENDIENTE` $\rightarrow$ `EN_DIAGNOSTICO` $\rightarrow$ `ESPERANDO_REPUESTO` $\rightarrow$ `RESUELTO` $\rightarrow$ `BAJA`) with technical notes and ISO 8601 timestamps.
- **Local ACID Persistence:** Powered by local SQLite (`./data/labtrack.db`) using fast synchronous drivers without heavy daemon overhead.
- **LAN Autonomous (Offline-First):** Works seamlessly in isolated classroom local area networks without external internet access.
- **Reactive SPA Frontend:** Real-time search, multi-criteria filtering, and lab station health metrics.

---

## 📂 Project Structure / Estructura del Proyecto

```text
labtrack/
├── package.json
├── SPEC.md
├── README.md
├── .gitignore
├── data/                      # Local SQLite storage (git-ignored)
├── server/                    # Express ESM REST API
│   ├── index.js
│   ├── db.js
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   └── middlewares/
└── client/                    # React 18 + Vite SPA
    ├── index.html
    └── src/
```

---

## 👤 Author / Autor

- **Tiziano Espinoza** ([@TIXIANO70](https://github.com/TIXIANO70))  
  *Técnico en Computación & Full Stack Developer*
