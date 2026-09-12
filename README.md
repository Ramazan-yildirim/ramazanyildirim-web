# Ramazan // Digital Mind

Ramazan Yildirim’s personal website, built with Next.js App Router, React,
TypeScript, and Tailwind CSS. Development and checks run inside Docker.

## Development

```sh
docker compose up -d
docker compose exec web npm run lint
docker compose exec web npm run build
```

The development site is available at http://localhost:3000. Source files are
mounted into the web service; ordinary edits do not require rebuilding its image.

## Phase 1 architecture

- src/app: route composition, metadata, fonts, and global design tokens/styles.
- src/components/layout: navigation, footer, and the fixed decorative background.
- src/components/sections: hero, identity, and data-driven placeholder sections.
- src/components/ui: the shared semantic section shell.
- src/data/site.ts: navigation and neutral content awaiting verified details.

All current components are Server Components. Navigation uses ordinary anchors
and remains usable without JavaScript. The narrow-screen navigation stays visible;
there is no menu state or extra client bundle. Keyboard focus, a skip link, and
reduced-motion scrolling are included.

The background layer sits below the HTML content and is reserved for one future
React Three Fiber Canvas. Phase 1 imports no Three.js, R3F, Drei, or GSAP code.
Folders for 3D, hooks, models, textures, and other assets should be added when
they have an actual implementation; no empty scaffolding is required.

Real projects, experience, contact details, and AI integrations are not yet
provided. Placeholder copy makes no claims about achievements or active services.

## Next phase

After Phase 1 approval, introduce the single Canvas boundary, lazy loading,
responsive DPR limits, and a usable fallback. The AI Core visual prototype and
scroll-driven sequences belong to later phases.
