"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { RefObject } from "react";
import { sectionIds } from "@/data/site";
import { calculateScrollSnapshot, initialScrollSnapshot, type SectionMeasurement } from "@/lib/scroll-state";
import { useScrollStore } from "@/components/layout/scroll-experience";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function ScrollController({ scope }: { scope: RefObject<HTMLDivElement | null> }) {
  const store = useScrollStore();

  useGSAP(() => {
    const root = scope.current;
    if (!root) return;

    const sections = sectionIds.flatMap((id) => {
      const element = root.querySelector<HTMLElement>(`[data-scroll-section="${id}"]`);
      return element ? [{ id, element }] : [];
    });
    let measurements: SectionMeasurement[] = [];
    let viewportHeight = window.innerHeight;
    let maxScroll = 1;
    let activationOffset = 0;
    let disposed = false;
    let refreshFrame = 0;

    const measure = () => {
      viewportHeight = window.innerHeight;
      maxScroll = ScrollTrigger.maxScroll(window);
      activationOffset = (root.querySelector("header")?.getBoundingClientRect().height ?? 0) + 24;
      measurements = sections.map(({ id, element }) => ({
        id,
        top: element.getBoundingClientRect().top + window.scrollY,
        height: element.getBoundingClientRect().height,
      }));
    };
    const publish = (trigger: ScrollTrigger) => {
      if (disposed) return;
      store.publish(calculateScrollSnapshot(
        measurements, trigger.scroll(), viewportHeight, maxScroll,
        trigger.direction < 0 ? -1 : 1, activationOffset,
      ));
    };

    measure();
    const trigger = ScrollTrigger.create({
      id: "digital-mind:page",
      trigger: root,
      start: 0,
      end: () => Math.max(1, ScrollTrigger.maxScroll(window)),
      invalidateOnRefresh: true,
      onRefreshInit: measure,
      onRefresh: publish,
      onUpdate: publish,
    });

    const scheduleRefresh = () => {
      if (disposed || refreshFrame) return;
      refreshFrame = window.requestAnimationFrame(() => {
        refreshFrame = 0;
        if (!disposed) trigger.refresh();
      });
    };
    const observer = new ResizeObserver(scheduleRefresh);
    observer.observe(root);
    sections.forEach(({ element }) => observer.observe(element));
    document.fonts.ready.then(scheduleRefresh);
    document.fonts.addEventListener("loadingdone", scheduleRefresh);
    window.addEventListener("pageshow", scheduleRefresh);
    publish(trigger);

    return () => {
      disposed = true;
      observer.disconnect();
      window.cancelAnimationFrame(refreshFrame);
      document.fonts.removeEventListener("loadingdone", scheduleRefresh);
      window.removeEventListener("pageshow", scheduleRefresh);
      store.publish(initialScrollSnapshot);
      // useGSAP reverts only this controller's trigger, including in Strict Mode.
    };
  }, { scope, dependencies: [store], revertOnUpdate: true });

  return null;
}
