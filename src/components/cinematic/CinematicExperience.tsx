"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import heroLogo from "../../../RamazanYildirim_Logo.png";
import { HardwareInteractionOverlay } from "./HardwareInteractionOverlay";
import { UI_COPY, type Locale } from "./i18n";
import { RearIoOverlay } from "./RearIoOverlay";
import { createProgressSource, range } from "./scroll-progress";
import type {
  RearPortHover,
  RearPortId,
  SceneHover,
  SceneInteraction,
  ScreenAnchor,
} from "./scene-interaction";

const PcCanvas = dynamic(
  () => import("./PcCanvas").then((module) => module.PcCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="canvas-boot" aria-live="polite">
        3D
      </div>
    ),
  },
);

gsap.registerPlugin(ScrollTrigger, useGSAP);

const HARDWARE_INTERACTION_START = 0.92;
const MAIN_SEQUENCE_END = 520 / 720;
const REAR_INTERACTION_START = 0.96;
const LOCALE_STORAGE_KEY = "portfolio-locale-v1";
const LOCALE_CHANGE_EVENT = "portfolio-locale-change";
let localeOverride: Locale | null = null;

function getStoredLocale(): Locale {
  if (localeOverride) return localeOverride;

  try {
    const savedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return savedLocale === "en" ? "en" : "tr";
  } catch {
    return "tr";
  }
}

function getServerLocale(): Locale {
  return "tr";
}

function subscribeToLocale(onStoreChange: () => void) {
  const handleLocaleChange = () => onStoreChange();
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== LOCALE_STORAGE_KEY) return;
    localeOverride = null;
    onStoreChange();
  };

  window.addEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function updateLocale(nextLocale: Locale) {
  localeOverride = nextLocale;

  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
  } catch {
    // The in-memory selection still works when storage is unavailable.
  }

  window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
}

function getPhase(progress: number, rearProgress: number) {
  if (rearProgress > 0.01) return "rear";
  if (progress < 0.18) return "focus";
  if (progress < 0.4) return "reveal";
  if (progress < 0.9) return "assembly";
  return "complete";
}

export function CinematicExperience() {
  const rootRef = useRef<HTMLElement>(null);
  const progressSource = useMemo(() => createProgressSource(), []);
  const rearProgressSource = useMemo(() => createProgressSource(), []);
  const [interaction, setInteraction] = useState<SceneInteraction>(null);
  const [hoveredTarget, setHoveredTarget] = useState<SceneHover | null>(null);
  const [hoveredRearPort, setHoveredRearPort] =
    useState<RearPortHover | null>(null);
  const [interactionReady, setInteractionReady] = useState(false);
  const [rearInteractionReady, setRearInteractionReady] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [selectedRearPort, setSelectedRearPort] =
    useState<RearPortId | null>(null);
  const [ramFocusActive, setRamFocusActive] = useState(false);
  const locale = useSyncExternalStore(
    subscribeToLocale,
    getStoredLocale,
    getServerLocale,
  );
  const interactionReadyRef = useRef(false);
  const rearInteractionReadyRef = useRef(false);
  const closeInteraction = useCallback(() => setInteraction(null), []);
  const closeRamFocus = useCallback(() => {
    setHoveredTarget(null);
    setRamFocusActive(false);
  }, []);
  const handleHoverChange = useCallback(
    (target: SceneHover | null) => setHoveredTarget(target),
    [],
  );
  const handleRamClick = useCallback(
    (ramIndex: number, anchor: ScreenAnchor) => {
      setHoveredTarget(null);
      setInteraction({ anchor, kind: "ram", ramIndex });
    },
    [],
  );
  const handleCoolerClick = useCallback(() => {
    setHoveredTarget(null);
    setRamFocusActive(false);
    setInteraction({ kind: "cooler" });
  }, []);
  const handleGpuClick = useCallback(() => {
    setHoveredTarget(null);
    setRamFocusActive(false);
    setInteraction({ kind: "gpu" });
  }, []);
  const handleRearPortClick = useCallback((portId: RearPortId) => {
    setHoveredRearPort(null);
    setSelectedRearPort(portId);
    if (portId === "contact") setContactOpen(true);
  }, []);
  const handleLocaleChange = useCallback((nextLocale: Locale) => {
    updateLocale(nextLocale);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (interaction) {
        closeInteraction();
      } else if (contactOpen) {
        setContactOpen(false);
      } else {
        closeRamFocus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeInteraction, closeRamFocus, contactOpen, interaction]);

  useGSAP(
    () => {
      const root = rootRef.current;

      if (!root) return;

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (prefersReducedMotion) {
        progressSource.set(1);
        rearProgressSource.set(1);
        rearInteractionReadyRef.current = true;
        setRearInteractionReady(true);
        root.dataset.phase = "rear";
        root.style.setProperty("--hero-opacity", "0");
        root.style.setProperty("--complete-opacity", "0");
        root.style.setProperty("--rear-opacity", "1");
        root.style.setProperty("--scene-shade", "0.18");
        return;
      }

      const driver = { value: 0 };
      const updateDocument = () => {
        const progress = Math.min(1, driver.value / MAIN_SEQUENCE_END);
        const rearProgress = range(
          driver.value,
          MAIN_SEQUENCE_END,
          1,
        );
        const heroOpacity = 1 - range(progress, 0.08, 0.24);
        const revealCopyOpacity =
          range(progress, 0.2, 0.29) * (1 - range(progress, 0.39, 0.48));
        const assemblyOpacity =
          range(progress, 0.43, 0.53) * (1 - range(progress, 0.82, 0.92));
        const completeOpacity =
          range(progress, 0.9, 0.98) * (1 - range(rearProgress, 0, 0.2));
        const sceneShade =
          0.92 - range(progress, 0.1, 0.32) * 0.72 + rearProgress * 0.06;
        const nextInteractionReady =
          progress >= HARDWARE_INTERACTION_START && rearProgress < 0.01;
        const nextRearInteractionReady =
          rearProgress >= REAR_INTERACTION_START;

        if (nextInteractionReady !== interactionReadyRef.current) {
          interactionReadyRef.current = nextInteractionReady;
          setInteractionReady(nextInteractionReady);
          if (!nextInteractionReady) {
            setHoveredTarget(null);
            setInteraction(null);
            setRamFocusActive(false);
          }
        }

        if (
          nextRearInteractionReady !== rearInteractionReadyRef.current
        ) {
          rearInteractionReadyRef.current = nextRearInteractionReady;
          setRearInteractionReady(nextRearInteractionReady);
          if (!nextRearInteractionReady) {
            setHoveredRearPort(null);
            setContactOpen(false);
            setSelectedRearPort(null);
          }
        }

        progressSource.set(progress);
        rearProgressSource.set(rearProgress);
        root.dataset.phase = getPhase(progress, rearProgress);
        root.style.setProperty("--hero-opacity", heroOpacity.toFixed(4));
        root.style.setProperty(
          "--reveal-copy-opacity",
          revealCopyOpacity.toFixed(4),
        );
        root.style.setProperty(
          "--assembly-opacity",
          assemblyOpacity.toFixed(4),
        );
        root.style.setProperty(
          "--complete-opacity",
          completeOpacity.toFixed(4),
        );
        root.style.setProperty(
          "--rear-opacity",
          range(rearProgress, 0.68, 0.9).toFixed(4),
        );
        root.style.setProperty("--scene-shade", sceneShade.toFixed(4));
      };

      const tween = gsap.to(driver, {
        value: 1,
        ease: "none",
        onUpdate: updateDocument,
        scrollTrigger: {
          id: "pc-assembly-sequence",
          trigger: root,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.65,
          invalidateOnRefresh: true,
        },
      });

      updateDocument();

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    },
    {
      scope: rootRef,
      dependencies: [progressSource, rearProgressSource],
    },
  );

  return (
    <section
      ref={rootRef}
      className="cinematic-scroll"
      data-interaction={interaction?.kind ?? "none"}
      data-locale={locale}
      data-phase="focus"
    >
      <div className="cinematic-viewport" style={{ position: "fixed" }}>
        <PcCanvas
          hoveredTarget={hoveredTarget}
          interaction={interaction}
          interactionReady={interactionReady}
          locale={locale}
          onCoolerClick={handleCoolerClick}
          onGpuClick={handleGpuClick}
          onHoverChange={handleHoverChange}
          onRamFocusChange={setRamFocusActive}
          onRamClick={handleRamClick}
          onRearPortClick={handleRearPortClick}
          onRearPortHoverChange={setHoveredRearPort}
          progressSource={progressSource}
          ramFocusActive={ramFocusActive}
          rearInteractionReady={rearInteractionReady}
          rearProgressSource={rearProgressSource}
        />

        <div className="cinematic-shade" aria-hidden="true" />
        <div className="cinematic-vignette" aria-hidden="true" />

        <div
          aria-label={UI_COPY[locale].language.label}
          className="language-switcher"
          role="group"
        >
          {(["tr", "en"] as const).map((language) => (
            <button
              aria-label={UI_COPY[locale].language[language]}
              aria-pressed={locale === language}
              key={language}
              onClick={() => handleLocaleChange(language)}
              type="button"
            >
              {language.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="cinematic-overlays" id="top">
          <div className="hero-brand-logo">
            <Image
              alt="Ramazan Yıldırım"
              priority
              sizes="(max-width: 760px) 44px, 4vw"
              src={heroLogo}
            />
          </div>

          <section className="cinematic-copy-scene hero-copy">
            <h1>
              RAMAZAN
              <br />
              YILDIRIM
            </h1>
          </section>

          <section className="cinematic-copy-scene reveal-copy">
            <h2>
              {UI_COPY[locale].hero.reveal[0]}
              <br />
              {UI_COPY[locale].hero.reveal[1]}
            </h2>
          </section>

          <section className="cinematic-copy-scene assembly-copy">
            <h2>
              {UI_COPY[locale].hero.assembly[0]}
              <br />
              {UI_COPY[locale].hero.assembly[1]}
            </h2>
          </section>

          <section className="cinematic-copy-scene complete-copy">
            <h2>
              {UI_COPY[locale].hero.complete[0]}
              <br />
              {UI_COPY[locale].hero.complete[1]}
            </h2>
            <div
              aria-hidden={!interactionReady}
              className="component-selector"
              data-ready={interactionReady ? "true" : "false"}
            >
              <span>{UI_COPY[locale].hero.selector}</span>
              <strong>{UI_COPY[locale].hero.selectorItems}</strong>
            </div>
          </section>
        </div>

        <HardwareInteractionOverlay
          hoveredTarget={hoveredTarget}
          interaction={interaction}
          interactionReady={interactionReady}
          locale={locale}
          onClose={closeInteraction}
          onRamFocusClose={closeRamFocus}
          ramFocusActive={ramFocusActive}
        />
        <RearIoOverlay
          contactOpen={contactOpen}
          hoveredPort={hoveredRearPort}
          locale={locale}
          onCloseContact={() => setContactOpen(false)}
          onOpenContact={() => setContactOpen(true)}
          onSelectPort={handleRearPortClick}
          ready={rearInteractionReady}
          selectedPort={selectedRearPort}
        />
      </div>

      <div className="cinematic-spacer" aria-hidden="true" />
    </section>
  );
}
