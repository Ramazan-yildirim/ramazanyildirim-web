"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HardwareInteractionOverlay } from "./HardwareInteractionOverlay";
import { createProgressSource, range } from "./scroll-progress";
import type {
  SceneHover,
  SceneInteraction,
  ScreenAnchor,
} from "./scene-interaction";

const PcCanvas = dynamic(
  () => import("./PcCanvas").then((module) => module.PcCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="canvas-boot" aria-live="polite">
        3D sahne hazırlanıyor
      </div>
    ),
  },
);

gsap.registerPlugin(ScrollTrigger, useGSAP);

function getPhase(progress: number) {
  if (progress < 0.18) return "focus";
  if (progress < 0.4) return "reveal";
  if (progress < 0.9) return "assembly";
  return "complete";
}

export function CinematicExperience() {
  const rootRef = useRef<HTMLElement>(null);
  const progressSource = useMemo(() => createProgressSource(), []);
  const [interaction, setInteraction] = useState<SceneInteraction>(null);
  const [hoveredTarget, setHoveredTarget] = useState<SceneHover | null>(null);
  const [interactionReady, setInteractionReady] = useState(false);
  const interactionReadyRef = useRef(false);
  const closeInteraction = useCallback(() => setInteraction(null), []);
  const handleHoverChange = useCallback(
    (target: SceneHover | null) => setHoveredTarget(target),
    [],
  );
  const handleRamClick = useCallback(
    (ramIndex: number, anchor: ScreenAnchor) => {
      setHoveredTarget(null);
      setInteraction({ anchor, kind: "ram", ramIndex });
    },
    [],
  );
  const handleCoolerClick = useCallback(() => {
    setHoveredTarget(null);
    setInteraction({ kind: "cooler" });
  }, []);
  const handleGpuClick = useCallback(() => {
    setHoveredTarget(null);
    setInteraction({ kind: "gpu" });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeInteraction();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeInteraction]);

  useGSAP(
    () => {
      const root = rootRef.current;

      if (!root) return;

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (prefersReducedMotion) {
        progressSource.set(1);
        interactionReadyRef.current = true;
        setInteractionReady(true);
        root.dataset.phase = "complete";
        root.style.setProperty("--hero-opacity", "1");
        root.style.setProperty("--scene-shade", "0.18");
        return;
      }

      const driver = { value: 0 };
      const updateDocument = () => {
        const progress = driver.value;
        const heroOpacity = 1 - range(progress, 0.08, 0.24);
        const revealCopyOpacity =
          range(progress, 0.2, 0.29) * (1 - range(progress, 0.39, 0.48));
        const assemblyOpacity =
          range(progress, 0.43, 0.53) * (1 - range(progress, 0.82, 0.92));
        const completeOpacity = range(progress, 0.9, 0.98);
        const sceneShade = 0.92 - range(progress, 0.1, 0.32) * 0.72;
        const nextInteractionReady = progress >= 0.995;

        if (nextInteractionReady !== interactionReadyRef.current) {
          interactionReadyRef.current = nextInteractionReady;
          setInteractionReady(nextInteractionReady);
          if (!nextInteractionReady) {
            setHoveredTarget(null);
            setInteraction(null);
          }
        }

        progressSource.set(progress);
        root.dataset.phase = getPhase(progress);
        root.style.setProperty("--hero-opacity", heroOpacity.toFixed(4));
        root.style.setProperty(
          "--reveal-copy-opacity",
          revealCopyOpacity.toFixed(4),
        );
        root.style.setProperty(
          "--assembly-opacity",
          assemblyOpacity.toFixed(4),
        );
        root.style.setProperty(
          "--complete-opacity",
          completeOpacity.toFixed(4),
        );
        root.style.setProperty("--scene-shade", sceneShade.toFixed(4));
      };

      const tween = gsap.to(driver, {
        value: 1,
        ease: "none",
        onUpdate: updateDocument,
        scrollTrigger: {
          id: "pc-assembly-sequence",
          trigger: root,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.65,
          invalidateOnRefresh: true,
        },
      });

      updateDocument();

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    },
    { scope: rootRef, dependencies: [progressSource] },
  );

  return (
    <section
      ref={rootRef}
      className="cinematic-scroll"
      data-interaction={interaction?.kind ?? "none"}
      data-phase="focus"
    >
      <div className="cinematic-viewport" style={{ position: "fixed" }}>
        <PcCanvas
          hoveredTarget={hoveredTarget}
          interaction={interaction}
          interactionReady={interactionReady}
          onCoolerClick={handleCoolerClick}
          onGpuClick={handleGpuClick}
          onHoverChange={handleHoverChange}
          onRamClick={handleRamClick}
          progressSource={progressSource}
        />

        <div className="cinematic-shade" aria-hidden="true" />
        <div className="cinematic-vignette" aria-hidden="true" />

        <div className="cinematic-overlays" id="top">
          <section className="cinematic-copy-scene hero-copy">
            <h1>
              RAMAZAN
              <br />
              YILDIRIM
            </h1>
          </section>

          <section className="cinematic-copy-scene reveal-copy">
            <h2>
              INSIDE
              <br />
              THE MACHINE
            </h2>
          </section>

          <section className="cinematic-copy-scene assembly-copy">
            <h2>
              PRECISION
              <br />
              IN MOTION
            </h2>
          </section>

          <section className="cinematic-copy-scene complete-copy">
            <h2>
              BUILT TO
              <br />
              THINK
            </h2>
            <div
              aria-hidden={!interactionReady}
              className="component-selector"
              data-ready={interactionReady ? "true" : "false"}
            >
              <span>SELECT A COMPONENT</span>
              <strong>RAM · COOLING · GPU</strong>
            </div>
          </section>
        </div>

        <HardwareInteractionOverlay
          hoveredTarget={hoveredTarget}
          interaction={interaction}
          interactionReady={interactionReady}
          onClose={closeInteraction}
        />
      </div>

      <div className="cinematic-spacer" aria-hidden="true" />
    </section>
  );
}
