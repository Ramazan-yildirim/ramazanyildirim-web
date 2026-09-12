# Ramazan // Digital Mind

Ramazan Yildirim's personal website, built with Next.js App Router, React,
TypeScript, Tailwind CSS, and React Three Fiber. Development and checks run in Docker.

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
the HTML. It uses a perspective camera and directional lighting. The CSS atmosphere stays visible underneath.

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

## Phase 3 AI Core prototype

The dormant core is built entirely from small procedural geometries; there are
no downloaded models, textures, postprocessing effects, particles, or new packages.
Three spherical shell sectors use dark metallic materials. A faceted inner
energy mesh, segmented equatorial trim, and a polar collar establish the form.
Desktop adds one thin outer arc; mobile omits it and reduces mesh subdivisions.

The shell sectors are independent, named groups under ai-core, ready for the
future transformation phase. AICore owns the object; CoreStage owns responsive
placement and hero visibility. Lighting remains in SceneEnvironment.

The core is deliberately static in this phase. Demand rendering, DPR limits,
reduced-motion behavior, and WebGL fallbacks from Phase 2 remain in place.
The core keeps the Phase 3 visibility rule: at least 55% of the hero must be
visible. Phase 4 now supplies that value through the common scroll state.
The Canvas stays mounted during navigation.

## Phase 4 ScrollTrigger architecture

ScrollExperience is a small client boundary around server-rendered children.
It owns a per-page external store; there is no mutable global store shared across
requests. The HTML sections remain Server Components and expose typed
`data-scroll-section` references, with their IDs defined in src/data/site.ts.

ScrollController is dynamically loaded only when reduced motion is off. It
registers GSAP and ScrollTrigger and creates one scoped trigger named
`digital-mind:page`. Native scrolling and anchors remain in control: no pinning,
scroll interception, scrub timeline, camera animation, or activation sequence is
introduced in this phase.

The store provides page progress (0-1), direction, active section, per-section
progress (0-1), and core visibility. Section progress starts when the section top
reaches the viewport midpoint and ends when its bottom passes that midpoint;
these bounds are clamped to the document's scrollable range. The active section
is the last section whose top has passed 24px below the sticky header. At the
end of the document, the final section is active. Identity maps to Home in
the six-link navigation.

Section geometry is measured on refresh and reused during scroll updates.
ResizeObserver, font readiness/font loading events, and pageshow schedule a
coalesced refresh; ScrollTrigger also handles viewport resize. Direct hash links
and restored scroll positions use the actual current scroll offset.

React consumers select only the values they need: navigation reads activeSection
and the Canvas boundary reads coreVisible. Continuous progress updates therefore
do not re-render those components. Future scene sequences can subscribe directly
to the store and invalidate the demand-rendered Canvas when a transform changes.

useGSAP owns trigger cleanup. Observer subscriptions, font/pageshow listeners,
and queued refresh frames are explicitly cleaned up. Teardown resets the store;
reduced-motion changes unmount the controller and restore the static experience.
The implementation does not call killAll or modify global ScrollTrigger defaults.

The seven Node tests using existing dependencies exercise normalized endpoints, direct/backward
jumps, the visibility boundary, overscroll and short documents, changed section
measurements, store isolation/unsubscription, and short-section anchor selection. They use the already installed
TypeScript compiler and run through `npm run test:scroll` inside Docker.

Implementation reference: [GSAP React lifecycle documentation](https://gsap.com/resources/React/).

## Next phase

After Phase 4 approval, use the shared scroll state to build the AI Core activation
sequence: controlled rotation, internal energy, and camera approach. Separation
into three entities belongs to Phase 6. Preserve one Canvas and all essential
content in HTML.
