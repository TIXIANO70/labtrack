# Manual de Usuario — LabTrack

Guía operativa para docentes y técnicos de laboratorio responsables del reporte de fallas, diagnóstico de hardware y mantenimiento del equipamiento informático.

---

## 1. Acceso y Verificación del Entorno

1. **Ingreso web:** Abrir el navegador en la dirección LAN del laboratorio (ej. `http://<IP-HOST>:3000`).
2. **Indicador de salud (Topbar):** En el extremo superior derecho, verificar el estado de conexión del sistema:
   - `API + SQLite OK` (punto verde): Servidor Express y base de datos SQLite operativos.
   - `Sin conexión API` (punto rojo) o `Conectando...`: Falla de enlace o servidor detenido.
3. **Acciones globales de cabecera:**
   - **`Actualizar`:** Recarga manual e instantánea de métricas, tickets y mapa de puestos.
   - **`Exportar CSV`:** Descarga directa de `labtrack-incidencias.csv` aplicando los filtros activos en pantalla.
4. **Mensajes del sistema:** Notificaciones flotantes de éxito o error que pueden descartarse mediante el botón **`✕`**.

---

## 2. Registro de Incidencias

El panel lateral **Registrar incidencia** permite asentar nuevas averías técnicas:

1. **Puesto / Equipo (`*`):** Identificador alfanumérico del equipo (ej. `LAB1-PC08`).
   - *Flujo rápido por URL:* Acceder mediante `http://<IP-HOST>:3000/?puesto=LAB1-PC08` autocompleta el puesto de forma automática.
2. **Componente afectado (`*`):** Menú desplegable con catálogo normalizado:
   - `Motherboard`, `CPU / Procesador`, `Memoria RAM`, `Almacenamiento (SSD/HDD)`, `Fuente de Poder`, `Placa de Video (GPU)`, `Periférico`, `Red / Ethernet`, `Otro`.
3. **Prioridad:** Nivel técnico de urgencia (`Baja`, `Media`, `Alta`, `Crítica`). Por defecto: `Media`.
4. **Síntoma técnico observado (`*`):** Detalle técnico de la falla (pitidos POST, caídas de tensión, fallas SMART, pantallazos).
5. **Técnico / Reportado por:** Nombre del docente o técnico que reporta (opcional, máx. 80 caracteres).
6. **Requiere adquisición / recambio de repuesto:** Casilla de verificación para marcar necesidad de piezas.
7. **Prevención de duplicados:** Si existe un ticket activo para el mismo puesto y componente, se emite la advertencia:  
   *`Ya existe una incidencia activa para <PUESTO> en <COMPONENTE> (<ESTADO>). Verificá antes de duplicar.`*
8. Pulsar **`Registrar ticket`** para almacenar el reporte.

---

## 3. Tablero de Métricas y Modos de Visualización

### Tarjetas de Métricas (StatCards)
Tarjetas interactivas en la parte superior que funcionan como filtros rápidos de estado:

| Tarjeta | Función / Filtro aplicado |
| :--- | :--- |
| **Total tickets** | Restablece los filtros de estado y lista todas las incidencias. |
| **Pendientes** | Filtra incidencias recibidas pendientes de inicio de revisión técnica. |
| **En diagnóstico** | Filtra equipos en mesa de trabajo bajo pruebas y mediciones. |
| **Esperando repuesto** | Filtra incidencias a la espera de recambio o compra de piezas. |
| **Resueltas** | Filtra incidencias con reparación completada satisfactoriamente. |
| **Cola de repuestos** | Conmuta el filtro exclusivo de tickets que requieren repuesto. |
| **Críticas activas** | Filtra únicamente incidencias vigentes catalogadas con prioridad `Crítica`. |

### Pestañas del Tablero
- **Tickets:** Lista tabular con columnas `Puesto`, `Componente & Síntoma`, `Prioridad`, `Estado`, `Técnico` y `Fecha`.
  - **Identificación visual:** Los tickets con repuesto pendiente muestran la insignia `Repuesto`.
  - **Filtros combinados:** Búsqueda textual por puesto, síntoma o técnico (`q`), más selectores de `Estado`, `Componente` y `Prioridad`. Botón **`Limpiar`** para reiniciar.
  - **Filtro rápido de puesto:** Al pulsar el botón del puesto en cualquier fila, se aísla su historial (botón **`Quitar filtro de puesto`** para retornar).
  - **Paginación:** Si existen más de 100 registros, se habilita el botón **`Cargar más incidencias (X restantes)`** (hasta 200).
- **Mapa de puestos:** Visualización en grilla del equipamiento físico:
  - *Estados visuales:* `Operativo` (verde), `Con falla activa` (ámbar) y `Dado de baja` (rojo).
  - *Detección de reincidencia:* Los puestos con 3 o más incidencias acumuladas exhiben la insignia **Reincidente**.
  - Al pulsar una tarjeta de puesto, se pasa a la pestaña `Tickets` filtrando dicho equipo.

---

## 4. Gestión del Ciclo de Vida y Bitácora

Al hacer clic en cualquier fila de la lista de incidencias, se abre el modal **Diagnóstico — [PUESTO]**:

1. **Encabezado del ticket:** Exhibe ID, componente, síntoma inicial, fecha de alta y fecha de resolución.
2. **Campos modificables:**
   - **Estado operativo:** Opciones `Pendiente`, `En diagnóstico`, `Esperando repuesto`, `Resuelto`, `Baja técnica` (si el puesto ya está en `Baja técnica`, la opción `Resuelto` queda inhabilitada).
   - **Prioridad:** Reclasificación técnica según necesidad operativa.
   - **Técnico asignado:** Asignación o actualización del responsable actual.
   - **Bitácora de diagnóstico y pruebas realizadas:** Anotaciones de mediciones con multímetro, pruebas MemTest, limpieza de zócalos o sustituciones.
   - **Requiere repuesto para finalizar reparación:** Casilla de verificación para coordinar stock.
3. **Persistencia:** Pulsar **`Guardar diagnóstico`**. Cada cambio agrega un evento auditable a la línea de tiempo cronológica al pie del modal.
4. **Cierre:** Botón **`Cerrar`** o tecla `Escape`.

---

## 5. Eliminación de Registros y Seguridad

Para suprimir tickets erróneos o creados por equivocación:

1. En el modal de diagnóstico, presionar el botón **`Eliminar registro`**.
2. **Confirmación en 2 pasos:** La interfaz sustituye el botón por **`Confirmar eliminación`** y **`Cancelar`** para impedir pérdidas accidentales.
3. **Autenticación por PIN:** Si el servidor tiene configurado `ADMIN_PIN` y rechaza la eliminación con código `403`:
   - Se despliega el campo **PIN administrativo de laboratorio** (`Ingresá ADMIN_PIN configurado`).
   - Ingresar el PIN de seguridad asignado por el administrador y pulsar **`Confirmar eliminación`** para ejecutar el borrado definitivo.
