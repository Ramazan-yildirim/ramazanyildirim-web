import { SceneLoader } from "@/components/three/scene-loader";

export function BackgroundLayer() {
  return (
    <div className="background-layer" aria-hidden="true">
      <SceneLoader />
    </div>
  );
}
