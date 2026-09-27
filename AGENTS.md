# Generador de CV

## Rol y objetivo
Eres un Desarrollador Full Stack con experiencia en Node.js, Express, Angular, PostgreSQL, Prisma y Tailwind CSS. Tu objetivo es construir una aplicación web que permita crear currículums vitae de alta calidad de forma rápida y sencilla.

El usuario podrá editar su perfil, experiencia, educación, habilidades y cualquier otra información relevante para un CV; ver una vista previa en tiempo real; y descargar el resultado en PDF. Todos los datos se guardan en la base de datos para que el usuario pueda acceder a ellos en cualquier momento.

Se priorizan una buena UI/UX, un diseño responsive (móvil, tablet y escritorio) y un código limpio, escalable y mantenible.

## Stack tecnológico
| Capa | Tecnología |
|---|---|
| Runtime | Node.js 22 LTS + TypeScript (`strict: true`) |
| Backend | Express 5 |
| ORM y migraciones | Prisma |
| Base de datos | PostgreSQL alojado en **Supabase** (desarrollo y producción); PostgreSQL 16 en Docker Compose solo para tests |
| Validación | zod (backend), Reactive Forms (frontend) |
| Frontend | Angular 21, componentes standalone, signals y zoneless (Angular 22 requiere Node ≥ 22.22.3) |
| Estilos | Tailwind CSS |
| Autenticación | JWT + bcrypt |
| Generación de PDF | Puppeteer |
| Tests | Jest + Supertest (backend), Vitest vía Angular CLI (frontend) |
| Calidad | ESLint + Prettier |

## Estructura del proyecto
```
/
├── backend/
│   ├── prisma/            # schema.prisma, migraciones y seed
│   ├── prisma.config.ts   # configuración de Prisma CLI (usa DIRECT_URL)
│   ├── src/
│   │   ├── config/        # carga y validación de variables de entorno
│   │   ├── generated/     # cliente de Prisma generado (no se sube a git)
│   │   ├── modules/       # un módulo por dominio: auth, users, cvs, pdf
│   │   │   └── <modulo>/  # *.routes.ts, *.controller.ts, *.service.ts, *.schema.ts
│   │   ├── templates/     # plantillas HTML/CSS de los CVs (compartidas por vista previa y PDF)
│   │   ├── middlewares/   # auth, manejo de errores, validación, rate limit
│   │   ├── lib/           # prisma client, instancia de Puppeteer, utilidades
│   │   ├── routes.ts      # monta los routers de cada módulo bajo /api
│   │   ├── app.ts         # createApp(): middlewares y rutas (lo usan server.ts y los tests)
│   │   └── server.ts      # arranque del servidor
│   └── tests/
├── frontend/
│   └── src/app/
│       ├── core/          # servicios singleton, interceptores, guards
│       ├── shared/        # componentes, pipes y directivas reutilizables
│       └── features/      # auth, dashboard, cv-editor, cv-preview
│   └── proxy.conf.json    # redirige /api a http://localhost:3000 en desarrollo
├── docker-compose.yml     # PostgreSQL local para la base de datos de test
├── .mcp.json              # servidor MCP de Supabase para agentes (solo lectura)
├── .env.example           # plantilla de .env (desarrollo, Supabase)
└── .env.test.example      # plantilla de .env.test (tests, PostgreSQL local)
```
Los archivos `.env` y `.env.test` viven en la **raíz** del repositorio; el backend los carga desde ahí.

## Comandos
```bash
cp .env.example .env                  # y rellenar los datos de Supabase
cp .env.test.example .env.test

cd backend && npm install             # también ejecuta prisma generate
npx prisma migrate dev                # aplicar migraciones en Supabase (usa DIRECT_URL)
npx prisma migrate deploy             # aplicar migraciones en producción / CI
npx prisma db seed                    # datos de ejemplo
npm run dev                           # API en http://localhost:3000
docker compose up -d                  # PostgreSQL local para tests (desde la raíz)
npm run test:db:migrate               # aplicar migraciones en la base de datos de test
npm test                              # usa DATABASE_URL de .env.test (nunca Supabase)
npm run lint
npm run typecheck
npm run build

cd frontend && npm install
npm start                             # app en http://localhost:4200
npm test
npm run lint
```
> Entorno de desarrollo: Windows. Los scripts de npm deben ser multiplataforma (usar `cross-env`, `rimraf`, etc. si hace falta).

## Variables de entorno
Documentarlas todas en `.env.example` (y las de test en `.env.test.example`), validarlas al arrancar con zod (`src/config`) y **no subir nunca `.env` al repositorio**.
```
# Supabase > Project Settings > Database > Connection string
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:4200
PORT=3000
```

## Despliegue
- Frontend en **Netlify** (`netlify.toml`): build de `frontend/`, publica `dist/frontend/browser` y reenvía `/api/*` a la API, para que la app y la API compartan origen y las cookies `SameSite=Strict` funcionen.
- API en **Render** con Docker (`render.yaml`, `backend/Dockerfile`, región Virginia, junto a Supabase `us-east-1`). La imagen incluye el Chromium de Puppeteer y `fonts-liberation`.
- Supabase: un proyecto de producción distinto del de desarrollo. Las migraciones se aplican a mano (`prisma migrate deploy` con `DIRECT_URL` de producción) **antes** de desplegar código que las necesite; la imagen no incluye la CLI de Prisma.
- Variables solo de producción: `TRUST_PROXY=2`, `PDF_MAX_CONCURRENT=1` y `PDF_DISABLE_SANDBOX=true`. Guía completa en `docs/DEPLOY.md`.

## Base de datos en Supabase
Supabase se usa **solo como PostgreSQL gestionado**. No se usan Supabase Auth, Storage, Realtime ni `@supabase/supabase-js`: la autenticación sigue siendo JWT propio y el acceso a datos siempre pasa por Prisma desde el backend.

- **Conexiones:**
  - `DATABASE_URL` → pooler de Supavisor en **modo transacción** (puerto `6543`, `?pgbouncer=true`). Es la que usa la API en ejecución.
  - `DIRECT_URL` → pooler en **modo sesión** (puerto `5432`). Es la que usa Prisma CLI para `migrate`, `db seed` e `introspect`, porque las migraciones no funcionan a través del modo transacción.
  - Se usa el host del pooler (`*.pooler.supabase.com`) en lugar de `db.<ref>.supabase.co`, porque la conexión directa solo funciona por IPv6 y suele fallar en redes domésticas o de Windows.
- **Configuración de Prisma:**
  - Se usa **Prisma 7**: la URL de la CLI va en `prisma.config.ts` (`DIRECT_URL`) y el cliente en ejecución usa el adaptador `@prisma/adapter-pg` con `DATABASE_URL`.
  - El generador `prisma-client` crea el cliente en `backend/src/generated/prisma` (formato CommonJS). Se importa desde `src/generated/prisma/client`, nunca desde `@prisma/client`.
  - `@prisma/client`, `@prisma/adapter-pg` y `prisma` deben tener siempre **la misma versión exacta**.
  - Una única instancia de `PrismaClient` en `src/lib/prisma.ts`.
- **SSL:** Supabase exige SSL. Si aparece `self-signed certificate in certificate chain`, descarga el certificado CA desde *Project Settings > Database* y pásalo en la configuración SSL del cliente; nunca uses `rejectUnauthorized: false` en producción.
- **Seguridad (Data API):** Supabase expone el esquema `public` a través de su API REST con la clave `anon`. Como Prisma crea las tablas en `public`, **cada migración que cree una tabla debe activar RLS en ella** (`ALTER TABLE "<Tabla>" ENABLE ROW LEVEL SECURITY;`) sin políticas, para que solo el backend (rol `postgres`, que se salta RLS) pueda acceder. Para ello, crea la migración con `prisma migrate dev --create-only`, añade las sentencias al final del `migration.sql` (como en la migración `init`) y después aplícala. Otra opción es desactivar la Data API en *Project Settings > API*. Las claves `anon` y `service_role` no se usan en este proyecto y **nunca** deben aparecer en el frontend ni en el repositorio.
- **Entornos:** un proyecto de Supabase para desarrollo y otro para producción. Los tests **nunca** se ejecutan contra Supabase: usan el PostgreSQL local de `docker-compose.yml` (`.env.test`).
- **Frontend:** Angular no se conecta a Supabase; solo habla con la API (`/api`, proxy en `frontend/proxy.conf.json`).
- **MCP para agentes:** `.mcp.json` configura el servidor MCP oficial de Supabase (`https://mcp.supabase.com/mcp`) en **modo solo lectura** y limitado al proyecto de desarrollo, para consultar el esquema y los datos. La autenticación es por OAuth en el navegador; no guardes tokens en el archivo. Los cambios de esquema se hacen **siempre** con migraciones de Prisma, nunca desde el MCP ni desde el SQL Editor del dashboard.

## Modelo de datos
- Un **usuario** puede tener **varios CVs**.
- Cada CV tiene un título interno, una plantilla (`templateId`), un idioma y las secciones:
  - Datos personales / perfil (nombre, puesto, resumen, email, teléfono, ubicación, enlaces)
  - Experiencia laboral
  - Educación
  - Habilidades (con nivel opcional)
  - Idiomas
  - Proyectos
  - Certificaciones
- Las secciones que son listas se guardan en tablas propias con un campo `order` para permitir reordenarlas.
- Todas las tablas tienen `id` (UUID), `createdAt` y `updatedAt`. Al borrar un CV se borran sus secciones en cascada.
- Entidades principales en Prisma: `User`, `RefreshToken`, `Cv`, `Experience`, `Education`, `Skill`, `Language`, `Project`, `Certification`.

## Autenticación y seguridad
- Contraseñas hasheadas con bcrypt (coste 12; 4 solo con `NODE_ENV=test`, para que los tests sean rápidos). Mínimo 8 caracteres, con al menos una letra y un número.
- **Access token** de corta duración y **refresh token** con rotación, ambos en **cookies httpOnly, `Secure` y `SameSite=Strict`**. No usar localStorage para tokens.
- Los refresh tokens se guardan hasheados en la base de datos para poder revocarlos (logout).
- **Autorización:** un usuario solo puede leer, modificar o borrar sus propios CVs. Filtrar siempre por `userId` en las consultas de Prisma, nunca confiar en IDs enviados por el cliente.
- `helmet`, CORS restringido a `CORS_ORIGIN` y rate limiting en `/auth/login` y `/auth/register` con `express-rate-limit` (10 intentos cada 15 min por IP; en login solo cuentan los fallidos).
- Validar con zod todo lo que entra por `body`, `params` y `query`.
- No devolver nunca el hash de la contraseña ni detalles internos de errores en las respuestas.

### Implementación (módulo `auth`)
- **Endpoints:** `POST /api/auth/register` (201), `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout` (204) y `GET /api/auth/me`. Todos responden `{ user }` salvo logout.
- **Cookies:** `access_token` con `Path=/api` y `refresh_token` con `Path=/api/auth` (solo viaja a los endpoints de auth).
- **Refresh token:** JWT firmado con `JWT_REFRESH_SECRET` cuyo `jti` es el id de la fila `RefreshToken`; en la base de datos se guarda su hash SHA-256. Cada refresh revoca el token usado y emite uno nuevo. **Reutilizar un token ya revocado revoca todas las sesiones del usuario** (posible robo), por eso el frontend comparte una única petición de refresh entre peticiones concurrentes.
- **Rutas protegidas:** añade el middleware `requireAuth` y obtén el usuario con `getAuthUserId(res)` (`src/middlewares/require-auth.ts`).
- **Frontend:** `AuthService` (sesión en signals, restaurada con `provideAppInitializer`), `authInterceptor` (401 → refresh → reintento), `authGuard` / `guestGuard` y `safeReturnUrl` para evitar redirecciones abiertas. Tras el login se va a `/cvs`.

## Generación de PDF y vista previa (Puppeteer)
- **Una única fuente de verdad:** las plantillas viven en `backend/src/templates/<plantilla>/` como funciones TypeScript que devuelven un documento HTML completo con su CSS de impresión escrito a mano (`styles.ts`, en `pt`/`mm`, `@page` A4). No se usa Tailwind en las plantillas: el CSS de impresión se controla mejor a mano y así no hace falta un paso de compilación. `renderCvHtml()` (`templates/index.ts`) elige la plantilla por `templateId`; los textos de cada idioma del CV están en `templates/labels.ts`.
- **Vista previa:** `GET /api/cvs/:cvId/preview` devuelve el HTML del **CV guardado**. Como el editor autoguarda, la vista previa va ~1 s por detrás de lo que se escribe y es exactamente lo que se imprimirá. Angular la muestra en un `<iframe srcdoc sandbox="allow-same-origin">` (sin `allow-scripts`; same-origin solo para medir la altura), escalada al ancho disponible, y la recarga cuando cambia `SaveTracker.revision`.
- **PDF:** `GET /api/cvs/:cvId/pdf` imprime ese mismo HTML con Puppeteer (`page.setContent` + `page.pdf`, A4, `preferCSSPageSize`) y responde `attachment; filename="<nombre>.pdf"` (`Content-Disposition` expuesta por CORS). Está limitado a 20 peticiones por minuto. Si Chromium falla, responde `503 PDF_GENERATION_FAILED`.
- **Rendimiento (`src/lib/pdf-renderer.ts`):** un único navegador compartido, que se relanza si se cae; una página por petición, cerrada siempre en un `finally`; como máximo 2 renderizados a la vez (el resto espera turno) y 20 s de tiempo máximo. Puppeteer es solo ESM, así que se carga con `import()` dinámico. Se cierra en el apagado del servidor y al final de los tests.
- **Seguridad:** todo valor del usuario se interpola con la plantilla etiquetada `html` de `src/lib/html.ts`, que escapa por defecto; solo `http(s)` puede convertirse en enlace (`safeUrl`). El documento lleva una CSP `default-src 'none'` (sin scripts ni peticiones externas), y en Puppeteer además se desactiva JavaScript y se abortan todas las peticiones que no sean `data:`. Solo se usan fuentes del sistema (Arial / Liberation Sans).
- **Saltos de página:** `break-inside: avoid` en cada entrada y `break-after: avoid` en los títulos de sección. En pantalla el documento se ve continuo; los saltos se aplican en el PDF.
- **Desarrollo en Windows:** arranca el backend con `npm run dev` desde una terminal. Lanzado desde el panel de vista previa de la app de escritorio de Claude, la primera generación de PDF bloquea el proceso (no ocurre en terminal, en los tests ni en el build).

## Convenciones de la API
- API REST con prefijo `/api`. Recursos en plural y en inglés: `/api/auth`, `/api/cvs`, `/api/cvs/:id/experiences`.
- Códigos de estado correctos: `200`, `201` al crear, `204` al borrar, `400` validación, `401` sin autenticar, `403` sin permiso, `404` no encontrado, `409` conflicto (p. ej. email ya registrado), `500` error interno.
- Formato único de error:
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "Descripción legible", "details": [] } }
  ```
- Un middleware central de errores; los controladores no construyen respuestas de error a mano.
- Los controladores solo gestionan HTTP; la lógica de negocio va en los servicios y el acceso a datos mediante Prisma.

### API de CVs (módulo `cvs`, todo requiere sesión)
| Método y ruta | Respuesta |
|---|---|
| `GET /api/cvs` | `{ cvs }`: resumen de los CVs del usuario, el último modificado primero |
| `POST /api/cvs` `{ title, language? }` | `201 { cv }`: nuevo CV con nombre y email del usuario ya rellenados |
| `GET /api/cvs/:cvId` | `{ cv }`: CV completo con todas sus secciones ordenadas |
| `PATCH /api/cvs/:cvId` | `{ cv }`: actualización parcial de título, plantilla, idioma y perfil |
| `DELETE /api/cvs/:cvId` | `204` (borra también sus secciones) |
| `POST /api/cvs/:cvId/duplicate` | `201 { cv }`: copia con el título «… (copia)» |
| `GET /api/cvs/:cvId/preview` | `text/html`: el CV guardado renderizado con su plantilla |
| `GET /api/cvs/:cvId/pdf` | `application/pdf` como adjunto (límite: 20/min) |
| `GET` / `POST /api/cvs/:cvId/<seccion>` | `{ items }` / `201 { item }` (se añade al final) |
| `PATCH` / `DELETE /api/cvs/:cvId/<seccion>/:itemId` | `{ item }` / `204` |
| `PUT /api/cvs/:cvId/<seccion>/order` `{ ids }` | `{ items }`: `ids` debe incluir todos los elementos una sola vez |

- Secciones: `experiences`, `educations`, `skills`, `languages`, `projects`, `certifications`. Se declaran en `modules/cvs/sections/sections.config.ts` (campos, validación y rango de fechas) y comparten un servicio y un router genéricos: **una sección nueva solo requiere añadir su definición ahí**.
- Un CV de otro usuario responde `404 CV_NOT_FOUND` (no `403`), para no revelar qué ids existen. Un elemento que no pertenece al CV de la URL responde `404 ITEM_NOT_FOUND`.
- Las fechas se envían como `AAAA-MM-DD` y se devuelven en ISO (`2020-01-15T00:00:00.000Z`). La fecha de fin no puede ser anterior a la de inicio, también en actualizaciones parciales. Marcar `isCurrent` borra `endDate`.
- Los textos opcionales vacíos se guardan como `null`, y los enlaces (`links`, `url`, `credentialUrl`) solo admiten `http(s)`.
- Cualquier cambio en una sección actualiza el `updatedAt` del CV.

## Convenciones del frontend
- Componentes standalone, `ChangeDetectionStrategy.OnPush` y signals para el estado.
- Lazy loading por feature. Rutas protegidas con guards y un interceptor HTTP que envíe las cookies (`withCredentials`) y renueve el token cuando reciba un `401`.
- Formularios reactivos tipados, con mensajes de error claros junto a cada campo.
- Editor de CV organizado por secciones, con posibilidad de reordenar entradas y **autoguardado**, mostrando al usuario el estado del guardado.
- Diseño mobile-first con Tailwind. En escritorio, editor y vista previa lado a lado; en móvil, con pestañas.
- Accesibilidad: HTML semántico, etiquetas en todos los campos, navegación por teclado y contraste suficiente (WCAG 2.1 AA).
- Estados de carga, vacío y error en todas las vistas.

### Editor de CV (`features/cv-editor`, ruta `/cvs/:id`)
- **Campos:** los de cada sección se declaran en `editor-fields.ts` (`SECTION_CONFIGS`) y se pintan con el componente genérico `app-form-field`. Una sección nueva del backend solo necesita su configuración ahí. Las fechas se editan como mes (`<input type="month">`) y se envían como `AAAA-MM-01`.
- **Autoguardado:** usa siempre `autosave()` (`autosave.ts`). Guarda 800 ms después del último cambio, solo si el formulario es válido y con las peticiones en serie, para que un elemento nuevo no se cree dos veces. Al destruir el componente guarda los cambios pendientes.
- **Estado de guardado:** `SaveTracker` (proveído por el editor) agrega el estado de todos los formularios que se muestra en la cabecera (`Guardando…`, `Todos los cambios guardados`, `Cambios sin guardar`, `Error al guardar`). Todas las peticiones del editor pasan por `tracker.track()`.
- **Salir del editor:** `leaveEditorGuard` solo pide confirmación si hay cambios que no se pueden guardar (formularios inválidos o un error); `beforeunload` avisa mientras quede algo pendiente.
- **Disposición:** en escritorio (`lg`), editor a la izquierda y vista previa fija a la derecha; en pantallas pequeñas, pestañas «Editar» / «Vista previa». «Descargar PDF» (cabecera) espera hasta 3 s a que terminen los autoguardados pendientes antes de pedir el PDF.
- **Elementos de sección:** empiezan como borrador sin `id`. El primer guardado válido hace `POST` y los siguientes `PATCH`. Se reordenan con botones subir y bajar (las peticiones de orden también van en serie) y cada elemento gestiona su propio borrado.

## Convenciones de código
- **Código, nombres, rutas y commits en inglés. Textos de la interfaz en español.**
- Archivos en `kebab-case`, clases en `PascalCase`, variables y funciones en `camelCase`.
- Prohibido `any` salvo justificación en un comentario.
- Funciones pequeñas y con una sola responsabilidad. Nada de lógica duplicada entre módulos.
- Commits con Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).

## Tests
- **Backend:** tests de integración con Supertest para autenticación (registro, login, refresh, logout), el CRUD de CVs (incluyendo que un usuario **no** puede acceder a CVs ajenos) y la generación del PDF (responde `200` con un PDF válido). Tests unitarios para la lógica de los servicios.
- **Frontend:** tests de los servicios, guards, interceptor y componentes principales del editor.
- Usar una base de datos de test separada; nunca ejecutar los tests contra la base de datos de desarrollo. `env.ts` rechaza arrancar con `NODE_ENV=test` si `DATABASE_URL` apunta a Supabase, y los tests vacían todas las tablas antes de cada caso (`tests/helpers/db.ts`).
- **Sin Docker:** `npx prisma dev --name cv-test --detach` levanta un PostgreSQL local (puerto `51214`). Para usarlo, exporta `DATABASE_URL` y `DIRECT_URL` con `postgres://postgres:postgres@localhost:51214/template1?sslmode=disable` antes de `npm run test:db:migrate` y `npm test`; las variables exportadas tienen prioridad sobre `.env.test`.
- `npm test` usa `NODE_OPTIONS=--experimental-vm-modules` porque Prisma 7 carga su motor de consultas con `import()` dinámico, que Jest no permite sin esa opción.

## Requisitos del proyecto
1. **Autenticación:** registro, inicio de sesión, cierre de sesión y renovación de sesión de forma segura.
2. **Gestión de CVs:** CRUD completo de CVs y de cada una de sus secciones, incluido duplicar un CV.
3. **Editor por secciones:** perfil, experiencia, educación, habilidades, idiomas, proyectos y certificaciones, con reordenación y autoguardado.
4. **Vista previa en tiempo real** idéntica al PDF final.
5. **Descarga en PDF** generada con Puppeteer.
6. **Diseño responsive** y accesible.

## Fuera del alcance (por ahora)
- Varias plantillas de diseño (el modelo lo permite con `templateId`, pero se empieza con una sola).
- Subida de foto de perfil.
- Enlaces públicos para compartir un CV.
- Exportar a Word u otros formatos.
- Inicio de sesión con proveedores externos (Google, GitHub…).
- Recuperación de contraseña por email.

## Reglas de trabajo para el agente
- Pregunta antes de añadir una dependencia nueva que no esté en el stack.
- No modifiques migraciones que ya se han aplicado; crea siempre una migración nueva con `prisma migrate dev --name <descripcion>`.
- Ejecuta lint y tests antes de dar una tarea por terminada, e informa de cualquier fallo.
- Mantén `.env.example` y este documento al día cuando cambien las variables, los comandos o las decisiones de arquitectura.
- Ante una duda de producto (no técnica), pregunta en lugar de suponer.
