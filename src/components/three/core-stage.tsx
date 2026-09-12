import { useThree } from "@react-three/fiber";
import { AICore } from "@/components/three/ai-core";

export function CoreStage({ compact, visible }: { compact: boolean; visible: boolean }) {
  const viewport = useThree((state) => state.viewport);
  const size = useThree((state) => state.size);
  const x = viewport.width * (compact ? 0.25 : 0.27);
  const y = compact ? (0.5 - 250 / size.height) * viewport.height : 0;
  const scale = compact
    ? viewport.width * 0.12
    : Math.min(viewport.width * 0.145, viewport.height * 0.27);

  return (
    <group name="core-stage" position={[x, y, 0]} scale={scale} visible={visible}>
      <AICore compact={compact} />
    </group>
  );
}
