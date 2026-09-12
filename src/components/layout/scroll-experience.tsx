"use client";

import dynamic from "next/dynamic";
import { createContext, useContext, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { createScrollStore, initialScrollSnapshot, type ScrollSnapshot, type ScrollStore } from "@/lib/scroll-state";

const ScrollController = dynamic(() => import("@/components/layout/scroll-controller"), { ssr: false });
const ScrollContext = createContext<ScrollStore | null>(null);

export function useScrollStore() {
  const store = useContext(ScrollContext);
  if (!store) throw new Error("Scroll consumers must be inside ScrollExperience.");
  return store;
}

// Select stable values (such as activeSection or coreVisible) to avoid rendering
// React components for every change in continuous scroll progress.
export function useScrollSelector<T>(selector: (snapshot: ScrollSnapshot) => T) {
  const store = useScrollStore();
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getSnapshot()),
    () => selector(initialScrollSnapshot),
  );
}

export function ScrollExperience({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  const [store] = useState(createScrollStore);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)", true);

  return (
    <ScrollContext.Provider value={store}>
      <div ref={scope}>
        {children}
        {!reducedMotion && <ScrollController scope={scope} />}
      </div>
    </ScrollContext.Provider>
  );
}
