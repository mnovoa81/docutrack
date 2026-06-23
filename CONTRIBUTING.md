# Contribuir a DocuTrack

¡Gracias por tu interés en mejorar DocuTrack! Este documento explica cómo participar.

## Formas de contribuir

- **Reportar bugs** — abre un issue con el template de bug report
- **Proponer features** — abre un issue con el template de feature request
- **Enviar un PR** — corrige un bug o implementa un feature aprobado
- **Mejorar la documentación** — README, comentarios, ejemplos

## Antes de abrir un PR

1. Revisa los [issues abiertos](https://github.com/mnovoaq/docutrack/issues) para no duplicar trabajo
2. Para cambios grandes, abre primero un issue para discutir la dirección
3. Para bugs simples, puedes ir directo al PR

## Setup local

```bash
git clone https://github.com/mnovoaq/docutrack.git
cd docutrack
node bin/docutrack.js --help   # sin npm install — sin dependencias
```

Para probar en un proyecto real:

```bash
cd /tu-proyecto
node /ruta/a/docutrack/bin/docutrack.js init
node /ruta/a/docutrack/bin/docutrack.js serve
```

## Estructura del proyecto

```
bin/           → CLI entry point
src/
  commands/    → cada subcomando (init, serve, scan, check…)
  viewer/      → servidor HTTP + index.html del visor web
  utils/       → queue, stale, drift, settings
  analyzer/    → detección de rutas y complejidad
templates/     → archivos copiados al hacer init
```

## Reglas del código

- **Sin dependencias npm** — todo usa módulos nativos de Node.js
- El visor web es un solo `index.html` autocontenido
- Los prompts de Claude van en `generateDoc()` dentro de `server.js`
- Soporta Node.js 18+

## Proceso de PR

1. Crea un fork y una rama descriptiva: `fix/scroll-sidebar`, `feat/export-pdf`
2. Haz commits pequeños y atómicos
3. Asegúrate de que `node bin/docutrack.js serve` siga funcionando
4. Abre el PR con descripción clara de qué cambia y por qué

## Reportar un bug

Usa el template de issue e incluye:
- Versión de DocuTrack (`docutrack --version`)
- Sistema operativo y versión de Node.js
- Pasos para reproducir
- Comportamiento esperado vs actual

---

¿Dudas? Abre un issue con el label `question`.
