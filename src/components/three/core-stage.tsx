import { useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { AICore } from "@/components/three/ai-core";

export function CoreStage({ compact }: { compact: boolean }) {
  const viewport = useThree((state) => state.viewport);
  const size = useThree((state) => state.size);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const hero = document.getElementById("home");
    if (!hero) return;

    // Keep the visual prototype out of later text sections. Scroll choreography
    // will replace this visibility boundary in the dedicated ScrollTrigger phase.
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.intersectionRatio >= 0.55);
    }, { threshold: [0, 0.55] });

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

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
