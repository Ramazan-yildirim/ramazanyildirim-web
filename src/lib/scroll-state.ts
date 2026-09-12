import type { SectionId } from "@/data/site";

export type SectionMeasurement = {
  id: SectionId;
  top: number;
  height: number;
};

export type ScrollSnapshot = {
  ready: boolean;
  progress: number;
  direction: 1 | -1;
  activeSection: SectionId | null;
  sections: Readonly<Partial<Record<SectionId, number>>>;
};

export const initialScrollSnapshot: ScrollSnapshot = {
  ready: false,
  progress: 0,
  direction: 1,
  activeSection: null,
  sections: {},
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));

// Section progress runs from the section reaching the viewport midpoint to its
// bottom passing that midpoint, clamped to the page's actual scrollable range.
export function calculateScrollSnapshot(
  measurements: SectionMeasurement[],
  scrollY: number,
  viewportHeight: number,
  maxScroll: number,
  direction: 1 | -1,
  activationOffset = viewportHeight / 2,
): ScrollSnapshot {
  const sections: Partial<Record<SectionId, number>> = {};
  let activeSection: SectionId | null = measurements[0]?.id ?? null;

  for (const section of measurements) {
    const start = Math.max(0, section.top - viewportHeight / 2);
    const end = Math.min(maxScroll, section.top + section.height - viewportHeight / 2);
    sections[section.id] = clamp((scrollY - start) / Math.max(1, end - start));

    // Native anchor scrolling rounds offsets while layout can retain subpixels.
    if (section.top <= scrollY + activationOffset + 1) activeSection = section.id;

  }

  if (maxScroll > 0 && scrollY >= maxScroll - 1) {
    activeSection = measurements.at(-1)?.id ?? null;
  }

  return { ready: true, progress: clamp(scrollY / Math.max(1, maxScroll)), direction, activeSection, sections };
}

export function createScrollStore() {
  let snapshot = initialScrollSnapshot;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    publish: (next: ScrollSnapshot) => {
      if (
        snapshot.ready === next.ready &&
        snapshot.progress === next.progress &&
        snapshot.direction === next.direction &&
        snapshot.activeSection === next.activeSection &&
        Object.keys(snapshot.sections).length === Object.keys(next.sections).length &&
        Object.entries(next.sections).every(([id, value]) => snapshot.sections[id as SectionId] === value)
      ) return;

      snapshot = next;
      listeners.forEach((listener) => listener());
    },
  };
}

export type ScrollStore = ReturnType<typeof createScrollStore>;
