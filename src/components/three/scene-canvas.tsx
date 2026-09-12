"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { SceneEnvironment } from "@/components/three/scene-environment";

function ContextGuard({ onLost }: { onLost: () => void }) {
  const canvas = useThree((state) => state.gl.domElement);

  useEffect(() => {
    const handleLost = (event: Event) => {
      event.preventDefault();
      onLost();
    };

    canvas.addEventListener("webglcontextlost", handleLost);
    return () => canvas.removeEventListener("webglcontextlost", handleLost);
  }, [canvas, onLost]);

  return null;
}

export default function SceneCanvas() {
  const compact = useMediaQuery("(max-width: 700px)", true);
  const [contextLost, setContextLost] = useState(false);
  const handleContextLost = useCallback(() => setContextLost(true), []);

  if (contextLost) return null;

  return (
    <Canvas
      className="scene-canvas"
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
      fallback={null}
      frameloop="demand"
      dpr={compact ? 1 : [1, 1.5]}
      camera={{ position: [0, 0, 8], fov: 35, near: 0.1, far: 100 }}
      gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
      resize={{ scroll: false, debounce: { scroll: 0, resize: 100 } }}
    >
      <ContextGuard onLost={handleContextLost} />
      <SceneEnvironment />
    </Canvas>
  );
}
