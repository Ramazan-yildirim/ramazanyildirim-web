import { gsap } from "gsap";
import type { CorePose } from "@/lib/core-sequence";

export function createCoreTimeline(pose: CorePose, compact: boolean) {
  return gsap.timeline({ paused: true, defaults: { ease: "none" } })
    .to(pose, { yaw: 0.28, energy: 0.5, duration: 0.12 }, 0)
    .to(pose, { opacity: 0, duration: 0.08 }, 0.12)
    .set(pose, { focus: 1, scale: compact ? 2.35 : 0.9 }, 0.2)
    .to(pose, { opacity: 1, duration: 0.08 }, 0.2)
    .to(pose, {
      yaw: compact ? 1.05 : 1.9,
      tilt: compact ? 0.3 : 0.44,
      energy: compact ? 1.2 : 1.85,
      rim: compact ? 3 : 3.8,
      cameraZ: compact ? 7.4 : 6.6,
      orbit: compact ? 0 : 0.8,
      duration: 0.46,
    }, 0.28)
    .to(pose, { opacity: 0, duration: 0.12 }, 0.8)
    .set(pose, { opacity: 0 }, 1);
}
