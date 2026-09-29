"use client";

import { Html, useProgress } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import { UI_COPY, type Locale } from "./i18n";
import { PcScene } from "./PcScene";
import type { ProgressSource } from "./scroll-progress";
import type {
  RearPortHover,
  RearPortId,
  SceneHover,
  SceneInteraction,
  ScreenAnchor,
} from "./scene-interaction";

type PcCanvasProps = {
  hoveredRearPort: RearPortHover | null;
  hoveredTarget: SceneHover | null;
  interaction: SceneInteraction;
  interactionReady: boolean;
  locale: Locale;
  onCoolerClick: () => void;
  onGpuClick: () => void;
  onHoverChange: (target: SceneHover | null) => void;
  onRamFocusChange: (active: boolean) => void;
  onRamClick: (ramIndex: number, anchor: ScreenAnchor) => void;
  onRearPortClick: (portId: RearPortId) => void;
  onRearPortHoverChange: (target: RearPortHover | null) => void;
  progressSource: ProgressSource;
  ramFocusActive: boolean;
  rearInteractionReady: boolean;
  rearProgressSource: ProgressSource;
  selectedRearPort: RearPortId | null;
};

function SceneLoader({ locale }: { locale: Locale }) {
  const { active, progress } = useProgress();
  const [fading, setFading] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!active && progress === 100) {
      const fadeTimer = setTimeout(() => setFading(true), 0);
      const hideTimer = setTimeout(() => setHidden(true), 450);
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [active, progress]);

  if (hidden) return null;

  return (
    <Html
      center
      className={`model-loader ${fading ? "model-loader-exit" : ""}`}
    >
      <span>{UI_COPY[locale].canvas.loading}</span>
      <strong>{Math.round(progress).toString().padStart(3, "0")}%</strong>
    </Html>
  );
}

export function PcCanvas({
  hoveredRearPort,
  hoveredTarget,
  interaction,
  interactionReady,
  locale,
  onCoolerClick,
  onGpuClick,
  onHoverChange,
  onRamFocusChange,
  onRamClick,
  onRearPortClick,
  onRearPortHoverChange,
  progressSource,
  ramFocusActive,
  rearInteractionReady,
  rearProgressSource,
  selectedRearPort,
}: PcCanvasProps) {
  return (
    <Canvas
      className="cinematic-canvas"
      camera={{
        fov: 31,
        near: 0.015,
        far: 80,
        position: [0, 0, 8],
      }}
      dpr={[1, 1.5]}
      frameloop="always"
      gl={{
        alpha: false,
        antialias: false,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = SRGBColorSpace;
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.08;
        gl.setClearColor("#020304", 1);
      }}
      fallback={
        <div className="webgl-fallback">
          {UI_COPY[locale].canvas.fallback}
        </div>
      }
    >
      <Suspense fallback={<SceneLoader locale={locale} />}>
        <PcScene
          hoveredRearPort={hoveredRearPort}
          hoveredTarget={hoveredTarget}
          interaction={interaction}
          interactionReady={interactionReady}
          onCoolerClick={onCoolerClick}
          onGpuClick={onGpuClick}
          onHoverChange={onHoverChange}
          onRamFocusChange={onRamFocusChange}
          onRamClick={onRamClick}
          onRearPortClick={onRearPortClick}
          onRearPortHoverChange={onRearPortHoverChange}
          progressSource={progressSource}
          ramFocusActive={ramFocusActive}
          rearInteractionReady={rearInteractionReady}
          rearProgressSource={rearProgressSource}
          selectedRearPort={selectedRearPort}
        />
      </Suspense>
    </Canvas>
  );
}
