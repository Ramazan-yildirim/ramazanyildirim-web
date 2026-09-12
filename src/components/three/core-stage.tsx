import { useRef } from "react";
import type { Group } from "three";
import type { ScrollStore } from "@/lib/scroll-state";
import { AICore } from "@/components/three/ai-core";
import { useCoreSequence } from "@/components/three/use-core-sequence";

export function CoreStage({ compact, store }: { compact: boolean; store: ScrollStore }) {
  const stage = useRef<Group>(null);
  useCoreSequence(stage, store, compact);

  return (
    <group ref={stage} name="core-stage" visible={false}>
      <AICore compact={compact} />
    </group>
  );
}
