# DocuTrack

**Plugin de Claude Code que documenta automáticamente lo que construyes.**

DocuTrack engancha los lifecycle hooks de Claude Code para registrar cada archivo modificado y generar documentación técnica en tiempo real — sin interrumpir tu flujo de trabajo.

---

## Instalación

```bash
npx docutrack init
```

Detecta tu stack automáticamente (Next.js, FastAPI, Express, Go, monorepo) y configura todo en segundos.

---

## ¿Qué hace?

- **Hook PostToolUse** — cada vez que Claude edita un archivo, lo encola automáticamente
- **Hook Stop** — al terminar la sesión, el subagente `documentalista` genera los docs de todo lo pendiente
- **Visor web** — interfaz tipo Notion en `localhost:4242` con sidebar, renderizado Markdown, API Explorer interactivo y Health Check
- **Generación con IA** — escanea proyectos existentes y genera toda la documentación con un clic desde el visor
- **Sin dependencias** — llama a la API de Anthropic directo via `https` nativo de Node.js

---

## Uso rápido

```bash
# Inicializar en tu proyecto
npx docutrack init

# Abrir el visor de documentación
docutrack serve

# Escanear un proyecto existente y generar docs
# → Usar el botón "Regenerar docs" en el visor

# Ver estado de cobertura
docutrack status

# Health check completo (drift, complejidad, stale)
docutrack check
```

---

## Comandos

| Comando | Descripción |
|---------|-------------|
| `docutrack init` | Inicializa DocuTrack en el proyecto actual |
| `docutrack serve` | Abre el visor web en el puerto 4242 |
| `docutrack scan` | Encola todos los archivos fuente existentes |
| `docutrack status` | Muestra cobertura, pendientes y docs desactualizados |
| `docutrack check` | Health check: drift, complejidad, stale |
| `docutrack analyze` | Detecta rutas y genera `docs/api/openapi.json` |
| `docutrack onboard` | Genera `docs/ONBOARDING.md` |
| `docutrack export` | Exporta a Mintlify o Docusaurus |
| `docutrack badge` | Genera badge SVG de cobertura |

---

## Templates soportados

Detección automática o manual con `--template`:

- `nextjs` — Next.js App Router
- `fastapi` — Python FastAPI
- `express` — Node.js Express / Fastify
- `monorepo` — Turborepo / pnpm workspaces
- `go` — Go modules

---

## Estructura generada

```
docs/
├── modules/        ← un .md por módulo/componente
├── api/            ← docs de rutas API + openapi.json
└── decisions/      ← Architecture Decision Records (ADRs)
ARCHITECTURE.md     ← vista general del proyecto (auto-generada con IA)
```

---

## Visor web

```bash
docutrack serve
# → http://localhost:4242
```

Incluye:
- Sidebar con todos los módulos, decisiones y rutas API
- **API Explorer** interactivo estilo Swagger
- **Health Check**: drift de código vs docs, mapa de complejidad
- **Generación desde la UI**: escanea y documenta sin abrir la terminal
- Toggle de idioma Español / English

---

## Requisitos

- Node.js 18+
- Claude Code CLI
- `ANTHROPIC_API_KEY` en el entorno o en `.env.local` (solo para generación con IA)

---

## Licencia

MIT — [mnovoaq](https://github.com/mnovoaq)
