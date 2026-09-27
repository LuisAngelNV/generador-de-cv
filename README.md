# Generador de CV

Aplicación web full stack para crear currículums profesionales: editas tus datos por secciones, ves el resultado **en tiempo real** y lo descargas en **PDF**. Todo se guarda automáticamente.

![Editor con vista previa en tiempo real](docs/screenshots/editor.png)

## Características

- **Cuentas de usuario** con registro, inicio de sesión y sesión persistente (JWT en cookies `httpOnly` con rotación de refresh tokens).
- **Varios CVs por usuario**: crear, renombrar, duplicar y eliminar.
- **Editor por secciones**: datos personales y enlaces, experiencia, educación, habilidades, idiomas, proyectos y certificaciones. Los elementos se reordenan y se eliminan con confirmación.
- **Autoguardado**: cada cambio válido se guarda a los 800 ms, con un indicador de estado global (`Guardando…`, `Todos los cambios guardados`…) y aviso antes de salir si queda algo sin guardar.
- **Vista previa en tiempo real** idéntica al PDF, porque ambos salen de la misma plantilla HTML.
- **Descarga en PDF** (A4) generada en el servidor con Puppeteer.
- **CV en español o inglés**: títulos y fechas se adaptan al idioma de cada CV.
- **Responsive y accesible**: editor y vista previa lado a lado en escritorio y en pestañas en móvil, navegación por teclado, etiquetas y mensajes de error asociados a cada campo.

## Capturas

| Mis CVs | Editor en móvil | Vista previa en móvil |
|---|---|---|
| ![Listado de CVs](docs/screenshots/dashboard.png) | ![Editor en móvil](docs/screenshots/mobile-editor.png) | ![Vista previa en móvil](docs/screenshots/mobile-preview.png) |

<details>
<summary>Registro y CV generado</summary>

![Registro](docs/screenshots/register.png)

![CV generado con la plantilla «classic»](docs/screenshots/cv-example.png)

</details>

> Todos los datos de las capturas son ficticios.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Angular 21 (standalone, signals, zoneless) · Tailwind CSS 4 · Reactive Forms |
| Backend | Node.js 22 · Express 5 · TypeScript (`strict`) · zod |
| Base de datos | PostgreSQL (Supabase) · Prisma 7 con `@prisma/adapter-pg` |
| Autenticación | JWT + bcrypt, cookies `httpOnly` / `Secure` / `SameSite=Strict` |
| PDF | Puppeteer (Chromium headless) |
| Tests | Jest + Supertest (backend) · Vitest (frontend) |
| Calidad | ESLint · Prettier |

## Arquitectura

```mermaid
flowchart LR
    subgraph Navegador
        A[Angular SPA]
        I[iframe de vista previa<br/>sandbox, sin scripts]
    end
    subgraph Backend[API Express]
        R[Rutas /api] --> S[Servicios]
        S --> T[Plantilla HTML del CV]
        T --> P[Puppeteer]
    end
    A -- "/api (cookies httpOnly)" --> R
    T -- "HTML" --> I
    P -- "PDF A4" --> A
    S -- Prisma --> DB[(PostgreSQL<br/>Supabase)]
```

- El frontend solo habla con la API. En desarrollo, el proxy de Angular redirige `/api` al backend, así que las cookies de sesión son del mismo origen.
- **Una sola fuente de verdad para el CV**: el backend genera un documento HTML con la plantilla (`backend/src/templates`). Ese mismo documento se muestra en la vista previa y se imprime a PDF.
- Supabase se usa solo como PostgreSQL gestionado; la autenticación es propia.

## Puesta en marcha

### Requisitos

- **Node.js ≥ 22.12** y npm.
- Una base de datos **PostgreSQL**. El proyecto está pensado para [Supabase](https://supabase.com) (el plan gratuito basta), pero sirve cualquier PostgreSQL.
- Para los tests del backend: **Docker** o, sin Docker, el PostgreSQL local de `prisma dev` (ver [Tests](#tests)).

### 1. Clonar e instalar

```bash
git clone https://github.com/<tu-usuario>/generador-de-cv.git
cd generador-de-cv
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

`npm install` en `backend` genera también el cliente de Prisma y descarga el Chromium que usa Puppeteer (~150 MB).

### 2. Base de datos en Supabase

1. Crea un proyecto en Supabase.
2. En **Project Settings → Database → Connection string** copia dos cadenas del *pooler*:
   - **Transaction** (puerto `6543`) → `DATABASE_URL`, la usa la API.
   - **Session** (puerto `5432`) → `DIRECT_URL`, la usa Prisma para las migraciones.

Las migraciones activan **Row Level Security** en todas las tablas, sin políticas. Así la API REST pública de Supabase no puede leer los datos; solo el backend, que se conecta como `postgres`.

### 3. Variables de entorno

Los archivos `.env` viven en la **raíz** del repositorio:

```bash
cp .env.example .env
cp .env.test.example .env.test
```

Rellena en `.env` las dos URLs de Supabase y dos secretos JWT distintos, de al menos 32 caracteres cada uno:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Conexión de la API (pooler en modo transacción) |
| `DIRECT_URL` | Conexión de Prisma CLI (pooler en modo sesión) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Secretos de firma, distintos entre sí |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Duración de los tokens (`15m`, `7d`…) |
| `CORS_ORIGIN` | Origen del frontend (`http://localhost:4200` en desarrollo) |
| `PORT` | Puerto de la API (`3000`) |

La API valida todas las variables al arrancar y no se inicia si falta alguna o no es válida.

### 4. Migraciones

```bash
cd backend
npx prisma migrate deploy
```

### 5. Arrancar

En dos terminales:

```bash
cd backend && npm run dev     # API en http://localhost:3000
```

```bash
cd frontend && npm start      # App en http://localhost:4200
```

Abre <http://localhost:4200>, crea una cuenta y empieza tu primer CV.

## Tests

**Backend**: tests de integración contra un PostgreSQL local. **Nunca** se ejecutan contra Supabase: la API se niega a arrancar en modo test con una URL de Supabase.

```bash
docker compose up -d            # PostgreSQL de pruebas en el puerto 5433 (desde la raíz)
cd backend
npm run test:db:migrate
npm test
```

<details>
<summary>Sin Docker</summary>

Prisma incluye un PostgreSQL local:

```bash
cd backend
npx prisma dev --name cv-test --detach
export DATABASE_URL="postgres://postgres:postgres@localhost:51214/template1?sslmode=disable"
export DIRECT_URL="$DATABASE_URL"
npm run test:db:migrate
npm test
```

</details>

**Frontend**:

```bash
cd frontend
npm test
```

**Calidad**: `npm run lint` en ambos proyectos, y además `npm run typecheck` en el backend.

## Estructura

```
├── backend/
│   ├── prisma/                 # schema.prisma y migraciones (con RLS)
│   ├── src/
│   │   ├── config/             # variables de entorno validadas con zod
│   │   ├── lib/                # Prisma, renderizador de PDF, helpers HTML
│   │   ├── middlewares/        # auth, validación, errores, rate limit
│   │   ├── modules/            # auth · cvs (+ secciones) · pdf · health
│   │   └── templates/          # plantillas del CV (HTML + CSS de impresión)
│   └── tests/                  # integración con Supertest
├── frontend/
│   └── src/app/
│       ├── core/               # auth (servicio, guards, interceptor), API de CVs
│       ├── shared/             # componentes reutilizables (diálogo)
│       └── features/           # home, auth, dashboard, cv-editor
├── docs/screenshots/
├── docker-compose.yml          # PostgreSQL para tests
└── AGENTS.md                   # convenciones y decisiones del proyecto
```

## API

Todas las rutas cuelgan de `/api`. Las de CVs requieren sesión. Los errores siguen siempre el mismo formato: `{ "error": { "code", "message", "details" } }`.

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/auth/register` · `/auth/login` | Crea la sesión (cookies) |
| `POST` | `/auth/refresh` · `/auth/logout` | Renueva o cierra la sesión |
| `GET` | `/auth/me` | Usuario actual |
| `GET` / `POST` | `/cvs` | Lista / crea CVs |
| `GET` / `PATCH` / `DELETE` | `/cvs/:cvId` | Detalle / actualización parcial / borrado |
| `POST` | `/cvs/:cvId/duplicate` | Duplica un CV con todas sus secciones |
| `GET` / `POST` | `/cvs/:cvId/<sección>` | Lista / añade elementos |
| `PATCH` / `DELETE` | `/cvs/:cvId/<sección>/:itemId` | Edita / elimina un elemento |
| `PUT` | `/cvs/:cvId/<sección>/order` | Reordena una sección |
| `GET` | `/cvs/:cvId/preview` | CV renderizado en HTML |
| `GET` | `/cvs/:cvId/pdf` | CV en PDF |

Secciones: `experiences`, `educations`, `skills`, `languages`, `projects`, `certifications`.

## Seguridad

- Contraseñas con **bcrypt** (coste 12). Los tokens van en cookies `httpOnly`, `Secure` y `SameSite=Strict`, nunca en `localStorage`.
- **Rotación de refresh tokens con detección de reutilización**: si se usa un token ya rotado, se revocan todas las sesiones del usuario.
- **Rate limiting** en login, registro y generación de PDF.
- Cada consulta filtra por el usuario de la sesión. Los CVs de otros usuarios responden `404`, para no revelar si existen.
- La plantilla escapa todo el contenido del usuario y lleva una CSP `default-src 'none'`. Puppeteer además desactiva JavaScript y bloquea cualquier petición de red. Solo se aceptan enlaces `http(s)`.
- RLS activado en Supabase y validación de todas las entradas con zod.

## Decisiones técnicas

- **La vista previa muestra el CV guardado**, no el formulario: con el autoguardado va aproximadamente un segundo por detrás y coincide exactamente con el PDF, sin duplicar la validación.
- **Plantilla con CSS de impresión escrito a mano** (en `pt`/`mm`, con `@page`) en lugar de Tailwind: se controla mejor en papel y no necesita un paso de compilación.
- **Secciones genéricas**: cada sección se declara una vez en el backend (`sections.config.ts`) y otra en el frontend (`editor-fields.ts`). Servicios, rutas y formularios son comunes.
- **Autoguardado en serie**: las peticiones de cada formulario van una tras otra, así un elemento nuevo nunca se crea dos veces.

## Solución de problemas

- **Windows**: arranca el backend con `npm run dev` desde una terminal normal. Lanzado desde ciertos gestores de procesos de IDEs, la primera generación de PDF puede quedarse bloqueada.
- **`self-signed certificate in certificate chain`** al conectar con Supabase: descarga el certificado CA desde *Project Settings → Database* y configúralo en la conexión. No desactives la verificación TLS en producción.
