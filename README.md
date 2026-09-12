# Ramazan // Digital Mind

Ramazan Yildirim's personal website, built with Next.js App Router, React,
TypeScript, Tailwind CSS, React Three Fiber, and GSAP. Development and checks run
in Docker.

## Development

```sh
docker compose up -d
docker compose exec web npm run lint
docker compose exec web npm run test:scroll
docker compose exec web npm run build
```

The development site is available at http://localhost:3000. Source files are
mounted into the web service; ordinary edits do not require rebuilding its image.

## Architecture

- src/app: route composition, metadata, fonts, and global styles.
- src/components/layout: navigation, footer, fixed background, and scroll controller.
- src/components/sections: server-rendered hero, identity, AI Core, and content sections.
- src/components/ui: shared semantic section shell.
- src/components/three: isolated client-side loading, Canvas, model, lighting, and animation.
- src/data/site.ts: typed section IDs, navigation, and neutral placeholder content.
- src/hooks/use-media-query.ts: reactive browser preferences with an SSR snapshot.
- src/lib/scroll-state.ts: normalized scroll measurements and per-page external store.
- src/lib/core-sequence.ts: initial camera/pose and scroll-to-sequence mapping.
- src/lib/webgl.ts: WebGL2 probe with immediate context disposal.

HTML sections remain Server Components; navigation and the three-step core status
are small client consumers. Ordinary anchors, keyboard focus, and a skip link
remain available. Real projects, experience, contact details, and AI integrations
await verified content.

## One demand-rendered scene

One transparent fixed Canvas sits behind the HTML. It loads dynamically after an
idle callback, uses a perspective camera, and retains the CSS atmosphere below it.
Reduced-motion visitors do not load the renderer. Motion preference changes apply
immediately. A WebGL2 probe releases its context without adding a second canvas.

The renderer uses DPR 1 up to 700px and a maximum of 1.5 above that breakpoint.
Antialiasing and shadows are disabled, and the renderer requests a low-power GPU.
Resize adjusts the camera and resolution without recreating the Canvas; ordinary
scrolling does not cause canvas resize measurements.

A scene-local error boundary isolates render/import failures. Context loss removes
the Canvas for that scene instance. HTML content remains available with WebGL
unavailable or after errors.

## AI Core

The procedural model has three named metallic spherical shell groups, a faceted
energy mesh, equatorial trim, and a polar collar. Desktop includes one thin outer
arc; mobile omits it and reduces subdivisions. No external models, textures,
particles, postprocessing, or extra dependencies are used.

AICore owns the model, CoreStage binds it to useCoreSequence, and SceneEnvironment
owns lighting. The separate shell groups remain ready for the next transformation
phase.

## Shared scroll state

ScrollExperience owns a per-page external store, with no mutable state shared
across requests. Eight server-rendered sections expose data-scroll-section IDs.
ScrollController loads only when reduced motion is off and creates one scoped
ScrollTrigger named digital-mind:page. Native scrolling and anchors remain in
control; there is no scroll interception or ScrollTrigger pinning.

The store provides readiness, page progress, direction, active section, and
per-section progress. Section progress runs from the section top reaching the
viewport midpoint to its bottom passing that midpoint, clamped to the document's
scrollable range. The active section is the last section beginning 24px below the
sticky header, with a one-pixel rounding tolerance. The document end selects the
last section. Identity and AI Core map to Home in the six-link navigation.

Geometry is cached on refresh. ResizeObserver, font readiness/loading events,
pageshow, and native ScrollTrigger resize handling keep it current. Direct links
and restored scroll positions use the current offset.

React consumers select only active section or the discrete core stage. The scene
subscribes directly to progress, without React renders on every scroll event.
useGSAP owns scoped cleanup; observers, event listeners, subscriptions, and queued
refresh frames are cleaned up explicitly. Teardown resets the store. No global
ScrollTrigger defaults or killAll calls are used.

## Phase 5 activation sequence

The hero core begins dormant. Early scrolling rotates it and raises internal
energy; it fades out for Identity. The AI Core section uses a CSS-sticky copy block
and a paused GSAP timeline driven by the shared ScrollTrigger state. The core
returns beside the text, rotates, brightens, and receives stronger rim lighting
while the camera approaches. It fades before the following AI Lab content.

Scrolling backward reverses the same timeline. Direct links seek immediately to
the correct pose. Camera movement follows the core's viewing ray, keeping its
screen position stable. Responsive placement uses the baseline camera distance so
resizing mid-sequence does not compound the zoom. Mobile centers the core below
the copy and reduces camera travel, rotation, and lighting.

The Canvas renders only when a visible pose changes or needs clearing. There is
no independent animation loop, and later hidden sections do not keep redrawing
the scene. Reduced-motion and no-JavaScript layouts collapse the long activation
section and retain its text. The Dormant / Energizing / Active labels describe the
visual sequence; they do not claim a live AI service.

## Verification

Eleven Node tests run through test:scroll using the installed TypeScript compiler
and real GSAP timeline. They cover scroll normalization, direct/backward jumps,
overscroll, short documents, refreshed measurements, isolated stores, anchor
selection, activation mapping, responsive poses, reverse seeking, and timeline
recreation.

Browser checks should cover forward/reverse scrolling, idle rendering, responsive
resize, navigation, direct links, motion preference changes, WebGL/context-loss
fallbacks, and no-JavaScript content in addition to lint and production build.

## Next phase

Phase 6 separates the activated core into three AI entities. Keep one Canvas,
preserve accessible HTML, and connect real AI functionality only through future
APIs.
