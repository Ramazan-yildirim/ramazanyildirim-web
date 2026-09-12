"use client";

import { useScrollSelector } from "@/components/layout/scroll-experience";

const stages = ["Dormant", "Energizing", "Active"];

export function CoreSequenceStatus() {
  const stage = useScrollSelector((state) => {
    if (!state.ready) return -1;
    const progress = state.sections["ai-core"] ?? 0;
    return progress < 0.15 ? 0 : progress < 0.7 ? 1 : 2;
  });

  return (
    <div className="core-sequence-status">
      <ol className="core-stages" aria-label="Core visualization stages">
        {stages.map((label, index) => (
          <li key={label} aria-current={stage === index ? "step" : undefined}>{label}</li>
        ))}
      </ol>
      <p className="core-sequence-hint">
        {stage < 0 ? "A visual study of the AI Core." : "Scroll to awaken the core. Move back to rewind."}
      </p>
    </div>
  );
}
