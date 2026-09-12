# Ramazan Yildirim Personal Website

This repository contains the personal portfolio website of Ramazan Yildirim.

The website should be a premium, cinematic, futuristic and scroll-driven digital experience centered around artificial intelligence, software engineering and personal projects.

## Core Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Three.js
- React Three Fiber
- Drei
- GSAP
- ScrollTrigger
- Docker
- Docker Compose

## Development Environment

Development and testing must be performed inside Docker.

Do not rely on globally installed Node.js or npm packages on the host machine.

The main Docker Compose service is:

web

Use Docker Compose commands for development tasks.

Examples:

docker compose exec web npm run lint

docker compose exec web npm run build

docker compose exec web npm install <package>

If the container is not running:

docker compose up -d

## Design Direction

The website should feel:

- premium
- futuristic
- cinematic
- minimal
- technical
- professional

Main visual characteristics:

- very dark background
- white or near-white typography
- subtle cyan / ice-blue primary accent
- restrained violet and amber accents
- large typography
- generous negative space
- cinematic 3D lighting
- subtle particles
- smooth scroll interactions

Avoid:

- excessive cyberpunk aesthetics
- excessive neon
- excessive glassmorphism
- visual clutter
- unnecessary gradients
- unnecessary animations
- gaming-style interfaces

The website should feel closer to a premium technology product than a gaming website.

## Core Experience

The visitor should feel like they are entering Ramazan's digital system.

Main narrative:

1. System Boot
2. Identity
3. AI Core
4. AI Core splits into three AI systems
5. AI Lab
6. Projects
7. Experience / About
8. Contact
9. System Online

## Main Sections

- Hero / Boot
- Identity
- AI Core
- AI Lab
- AI System 01
- AI System 02
- AI System 03
- Projects
- Experience
- About
- Contact

## 3D Architecture

Use a fixed React Three Fiber Canvas as the primary 3D scene.

Regular HTML and React sections should scroll above the Canvas.

Scroll progress should control the 3D environment.

Use GSAP ScrollTrigger for:

- camera movement
- AI Core animation
- object transformations
- lighting changes
- section transitions
- particle behavior

Avoid creating a separate WebGL canvas for every section.

Prefer one primary scene that changes according to scroll progress.

## AI Core

The AI Core will be the main visual identity of the website.

It should initially appear as a dormant futuristic object.

During scrolling:

- it activates
- emits subtle energy
- rotates
- the camera approaches it
- it transforms
- it eventually separates into three AI entities

Each AI entity will later represent a real AI system developed by Ramazan.

Do not implement fake AI functionality.

## Project Architecture

Keep regular UI components and Three.js components separated.

Preferred structure:

src/
  app/
  components/
    layout/
    sections/
    three/
    ui/
  data/
  hooks/
  lib/
  types/

public/
  images/
  models/
  textures/
  icons/

## Code Quality

- Use TypeScript properly.
- Use reusable components.
- Avoid very large components.
- Separate business logic from visual components.
- Keep Three.js logic isolated from regular UI where possible.
- Do not add unnecessary dependencies.
- Keep code readable and maintainable.
- Prefer simple implementations over unnecessary abstractions.

## Performance

Performance is a major requirement.

- Lazy-load expensive assets.
- Optimize GLTF/GLB models.
- Avoid unnecessarily large textures.
- Minimize Three.js draw calls.
- Keep particle counts reasonable.
- Reduce effects on mobile.
- Limit device pixel ratio where appropriate.
- Avoid blocking the main thread.
- Support prefers-reduced-motion.
- Keep the website usable without heavy animations.

## Responsive Design

Desktop may use the full 3D experience.

Mobile should use:

- reduced particles
- simplified effects
- simpler camera motion
- reduced visual complexity
- touch-friendly controls

The website must remain usable and professional on mobile.

## Accessibility

- Use semantic HTML where appropriate.
- Maintain sufficient contrast.
- Support keyboard navigation.
- Respect prefers-reduced-motion.
- Do not make essential information accessible only through animation.

## AI Integration

The website itself will be hosted on Vercel.

Actual AI models should not be bundled into the frontend.

Future AI systems should be accessed through APIs.

Expected architecture:

Next.js frontend
    |
    +-- AI API 01
    +-- AI API 02
    +-- AI API 03

Secrets and API keys must never be committed to Git.

Use environment variables.

## Required Checks

Before considering a development task complete, run:

docker compose exec web npm run lint

docker compose exec web npm run build

Fix errors before finishing.

## Codex Working Rules

Before modifying the project:

1. Read this AGENTS.md.
2. Inspect the existing repository.
3. Understand the current architecture.
4. Avoid rewriting unrelated code.
5. Keep changes scoped to the requested task.
6. Do not redesign the entire project unless explicitly requested.
7. Do not install dependencies unless they are actually needed.
8. Run lint and build checks after meaningful changes.
9. Explain major architectural changes after implementation.