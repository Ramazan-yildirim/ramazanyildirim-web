# Ramazan // Digital Mind

Ramazan Yildirim's personal website, built with Next.js App Router, React,
TypeScript, Tailwind CSS, and React Three Fiber. Development and checks run in Docker.

## Development

```sh
docker compose up -d
docker compose exec web npm run lint
docker compose exec web npm run build
```

The development site is available at http://localhost:3000. Source files are
mounted into the web service; ordinary edits do not require rebuilding its image.

## Architecture

- src/app: route composition, metadata, fonts, and global design tokens/styles.
- src/components/layout: navigation, footer, and the fixed decorative background.
- src/components/sections: hero, identity, and data-driven placeholder sections.
- src/components/ui: the shared semantic section shell.
- src/components/three: isolated client-side scene loading, Canvas, lighting, and error handling.
- src/data/site.ts: navigation and neutral content awaiting verified details.
- src/hooks/use-media-query.ts: reactive browser preferences with an SSR snapshot.
- src/lib/webgl.ts: WebGL2 availability check with immediate probe-context disposal.

HTML sections remain Server Components. Navigation uses ordinary anchors and
works without JavaScript. Keyboard focus, a skip link, and reduced-motion
scrolling are included. Real projects, experience, contact details, and AI
integrations await verified content.

## Phase 2 scene foundation

The fixed background contains one transparent React Three Fiber Canvas behind
the HTML. It uses a perspective camera and three lights, without meshes, models,
particles, controls, or animation. The CSS atmosphere stays visible underneath.

The renderer is dynamically imported on the client after an idle callback (with
a timeout fallback). Reduced-motion visitors retain the CSS background and do
not load the renderer. Changes to the motion preference apply immediately.
A WebGL2 probe checks support before loading the renderer and releases its
context immediately; it never inserts a second canvas into the document.

The scene renders on demand, with DPR 1 on screens up to 700px and a maximum of
1.5 on larger screens. Antialiasing and shadows are disabled, and the renderer
requests a low-power GPU. Resize updates the camera and resolution without
recreating the Canvas. Scrolling does not trigger canvas resize measurements.

A scene-local error boundary isolates render/import failures from the page.
Context loss removes the Canvas for the lifetime of that scene instance. The CSS
background remains available during loading, with WebGL unavailable, and after
errors. All user-facing information lives in HTML.

## Next phase

After Phase 2 approval, build the AI Core visual prototype inside the existing
scene. Camera choreography and GSAP ScrollTrigger integration belong to later
phases. Do not add additional canvases or client-side AI models.
