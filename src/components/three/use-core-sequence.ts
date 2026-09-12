import { useGSAP } from "@gsap/react";
import { useThree } from "@react-three/fiber";
import { gsap } from "gsap";
import type { RefObject } from "react";
import { DirectionalLight, Group, Mesh, MeshStandardMaterial, PerspectiveCamera } from "three";
import { coreCamera, createCorePose, getCoreSequenceProgress } from "@/lib/core-sequence";
import type { ScrollStore } from "@/lib/scroll-state";
import { createCoreTimeline } from "@/components/three/core-timeline";

gsap.registerPlugin(useGSAP);

export function useCoreSequence(stageRef: RefObject<Group | null>, store: ScrollStore, compact: boolean) {
  const { camera, gl, scene, size, invalidate } = useThree();

  useGSAP(() => {
    const stage = stageRef.current;
    const model = stage?.getObjectByName("ai-core");
    const energy = model?.getObjectByName("core-energy");
    const orbit = model?.getObjectByName("core-orbit");
    const rim = scene.getObjectByName("core-rim-light");
    const layer = gl.domElement.closest<HTMLElement>(".scene-canvas");
    if (!stage || !model || !layer || !(camera instanceof PerspectiveCamera) ||
      !(energy instanceof Mesh) || !(energy.material instanceof MeshStandardMaterial) ||
      !(rim instanceof DirectionalLight)) return;

    // Use the baseline camera distance so resizing mid-sequence cannot compound zoom.
    const height = 2 * Math.tan(coreCamera.fov * Math.PI / 360) * coreCamera.position[2];
    const width = height * size.width / size.height;
    const baseScale = compact ? width * 0.12 : Math.min(width * 0.145, height * 0.27);
    const heroY = compact ? (0.5 - 250 / size.height) * height : 0;
    const pose = createCorePose();
    const timeline = createCoreTimeline(pose, compact);
    let previous: number | null | undefined;

    const apply = () => {
      const progress = getCoreSequenceProgress(store.getSnapshot());
      if (progress === previous) return;
      previous = progress;
      if (progress === null) {
        stage.visible = false;
        layer.style.opacity = "0";
        invalidate();
        return;
      }

      const wasVisible = stage.visible;
      timeline.progress(progress);
      const heroX = compact ? 0.25 : 0.27;
      const focusX = compact ? 0 : 0.23;
      const focusY = height * (compact ? -0.17 : -0.04);
      const x = width * (heroX + (focusX - heroX) * pose.focus);
      const y = heroY + (focusY - heroY) * pose.focus;
      stage.position.set(x, y, 0);
      stage.scale.setScalar(baseScale * pose.scale);
      stage.visible = pose.opacity > 0.001;
      model.rotation.set(pose.tilt, pose.yaw, -0.32);
      energy.material.emissiveIntensity = pose.energy;
      rim.intensity = pose.rim;
      if (orbit) orbit.rotation.z = 0.3 + pose.orbit;

      // Approach along the core's viewing ray, preserving its screen position.
      const approach = 1 - pose.cameraZ / coreCamera.position[2];
      camera.position.set(x * approach, y * approach, pose.cameraZ);
      layer.style.opacity = String(pose.opacity);
      if (wasVisible || stage.visible) invalidate();
    };

    const unsubscribe = store.subscribe(apply);
    apply();
    return () => {
      unsubscribe();
      camera.position.set(...coreCamera.position);
      rim.intensity = 2.4;
      layer.style.opacity = "";
      stage.visible = false;
      // useGSAP reverts the paused timeline; there is no independent animation loop.
    };
  }, { dependencies: [store, compact, size.width, size.height, camera, gl, scene, invalidate], revertOnUpdate: true });
}
