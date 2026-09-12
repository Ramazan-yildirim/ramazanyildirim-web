"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { supportsWebGL } from "@/lib/webgl";
import { SceneBoundary } from "@/components/three/scene-boundary";

const SceneCanvas = dynamic(() => import("@/components/three/scene-canvas"), {
  ssr: false,
  loading: () => null,
});

function DeferredScene() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initialize = () => setReady(supportsWebGL());

    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(initialize, { timeout: 2000 });
      return () => window.cancelIdleCallback(handle);
    }

    const handle = globalThis.setTimeout(initialize, 200);
    return () => globalThis.clearTimeout(handle);
  }, []);

  return ready ? <SceneCanvas /> : null;
}

export function SceneLoader() {
  // Start with the CSS fallback during SSR and hydration.
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)", true);

  if (reducedMotion) return null;

  return (
    <SceneBoundary>
      <DeferredScene />
    </SceneBoundary>
  );
}
