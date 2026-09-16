"use client";

import { Html, useProgress } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import { PcScene } from "./PcScene";
import type { ProgressSource } from "./scroll-progress";

type PcCanvasProps = {
  progressSource: ProgressSource;
};

function SceneLoader() {
  const { active, progress } = useProgress();

  if (!active && progress === 100) return null;

  return (
    <Html center className="model-loader">
      <span>3D SYSTEM</span>
      <strong>{Math.round(progress).toString().padStart(3, "0")}%</strong>
    </Html>
  );
}

export function PcCanvas({ progressSource }: PcCanvasProps) {
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
          3D görünüm bu tarayıcıda kullanılamıyor.
        </div>
      }
    >
      <Suspense fallback={<SceneLoader />}>
        <PcScene progressSource={progressSource} />
      </Suspense>
    </Canvas>
  );
}
