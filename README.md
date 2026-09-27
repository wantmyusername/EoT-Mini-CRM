# CRM Exclusive On Trip

Sistema de gestión (SPA) para **Exclusive On Trip**: cotizador de tours, mini-CRM de transporte, control de flotilla e historial de accesos. Se sirve en **`/crm/`** y consume una API PHP en `https://exclusiveontrip.com/crm/api/`.

Hecho con **React + Vite + Tailwind CSS**.

**Sitio:** [exclusiveontrip.com/crm](https://exclusiveontrip.com/crm/)

## Módulos

| Módulo | Ruta | Qué hace |
|---|---|---|
| **Login** | `/` | Acceso al CRM (usuario/contraseña contra la API). |
| **Menú** | `/menu` | Panel con acceso a los módulos. |
| **Cotizador de Tours** | `/tours` | Genera vouchers/cotizaciones, catálogo de productos, historial, búsqueda y descarga de **PDF**. |
| **EoT CRM** | `/minicrm` | Gestión de servicios de transporte (listado, alta/edición, filtros, paginación, finanzas). |
| **Control de Flotilla** | `/flotilla` | Bitácora operativa: viajes, ingresos, gastos, kilometraje y combustible por unidad. |
| **Log** | `/secret-history` | Historial de accesos (con detección de dispositivo/navegador por User-Agent). |

## Rutas (React Router, `basename="/crm"`)

```
/                 → Login
/menu             → Menú principal        (protegida)
/tours            → Cotizador de Tours    (protegida)
/minicrm          → EoT CRM (transporte)  (protegida)
/flotilla         → Control de Flotilla   (protegida)
/secret-history   → Log / historial        (protegida)
```

## Stack

- **React 19** + **Vite 7**
- **Tailwind CSS 3**
- **React Router 7**
- **axios** (llamadas a la API)
- **lucide-react** (iconos)
- **html2pdf.js** + **react-to-print** (PDF / impresión)

## Backend (API PHP)

El frontend consume una API propia (no incluida en este repo):

| Base / endpoint | Uso |
|---|---|
| `…/crm/api/index.php` | Login (`?action=login`) e historial (`?action=get_logs`), y datos del cotizador. |
| `…/crm/api/transport.php` | Servicios de transporte (módulo EoT CRM). |
| `…/crm/api/api_flotilla.php` | Bitácora de flotilla. |
| `…/crm/api/ver.php` | Visor público del voucher de tours. |
| `…/crm/api/ver_transport.php` | Visor del voucher de transporte. |

Cada módulo define su `API_URL` al inicio del archivo (p. ej. `src/pages/ToursModule.jsx`, `src/pages/TransportModule.tsx`, `src/pages/FlotillaPage.jsx`, `src/pages/Login.jsx`).

## Requisitos

- **Node.js 18+** y npm.

## Desarrollo local

```bash
npm install
npm run dev      # http://localhost:5173/crm/
```

> Como `vite.config.js` define `base: '/crm/'`, el dev server sirve la app en **`/crm/`**.

Otros scripts:

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (Vite + HMR). |
| `npm run build` | Build de producción en `dist/`. |
| `npm run preview` | Previsualiza el build. |
| `npm run lint` | ESLint. |

## Deploy

App **estática**: `npm run build` y sube el contenido de `dist/` a la carpeta **`/crm/`** del dominio. La API PHP vive aparte, en `exclusiveontrip.com/crm/api/`.

## Estructura

```
index.html                    HTML base (título/descr., favicon /logo.png)
vite.config.js                base: '/crm/'
tailwind.config.js
src/
  main.jsx                    Entry point
  App.jsx                     Rutas + ProtectedRoute + títulos por página
  pages/
    Login.jsx                 Acceso (API ?action=login)
    DashboardMenu.jsx         Menú de módulos
    ToursModule.jsx           Cotizador de tours + PDF
    TransportModule.tsx       EoT CRM (transporte)
    FlotillaPage.jsx          Control de flotilla
    SiteHistory.jsx           Historial de accesos
public/
  logo.png · expertos.jpg · taxi.jpg · plantilla_presentacion.pdf
```

## Notas

- **Sesión:** el login guarda el usuario en `localStorage` (`crm_user`) y `ProtectedRoute` solo comprueba que exista. La autorización real debe hacerla el **backend**.
- **Credenciales:** el repo **no** contiene usuarios ni contraseñas; estas se envían a la API en el login.
- **Historial de git:** en commits anteriores vivía la versión antigua (un plugin de WordPress `transport-crm.php` + `travel-reservation.html`). Este repo ahora contiene la versión nueva del sistema.
- Este repositorio es **privado** (`"private": true`).
