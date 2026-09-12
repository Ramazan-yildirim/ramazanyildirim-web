import type { ScrollSnapshot } from "@/lib/scroll-state";

export const coreCamera = {
  position: [0, 0, 8] as [number, number, number],
  fov: 35,
  near: 0.1,
  far: 100,
};

export function createCorePose() {
  return {
    opacity: 1, focus: 0, scale: 1, yaw: -0.42, tilt: 0.24,
    energy: 0.22, rim: 2.4, cameraZ: 8, orbit: 0,
  };
}

export type CorePose = ReturnType<typeof createCorePose>;

export function getCoreSequenceProgress(snapshot: ScrollSnapshot): number | null {
  if (!snapshot.ready) return null;
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  const activation = clamp(snapshot.sections["ai-core"] ?? 0);
  return activation > 0
    ? 0.2 + activation * 0.8
    : clamp(snapshot.sections.home ?? 0) * 0.2;
}
