"use client";

import type { CSSProperties } from "react";
import { UI_COPY, type Locale } from "./i18n";
import type {
  SceneHover,
  SceneInteraction,
  ScreenAnchor,
} from "./scene-interaction";

type HardwareInteractionOverlayProps = {
  hoveredTarget: SceneHover | null;
  interaction: SceneInteraction;
  interactionReady: boolean;
  locale: Locale;
  onClose: () => void;
  onRamFocusClose: () => void;
  ramFocusActive: boolean;
};

type AnchorStyle = CSSProperties & {
  "--anchor-x": string;
  "--anchor-y": string;
};

function getAnchorStyle(anchor: ScreenAnchor): AnchorStyle {
  return {
    "--anchor-x": `${anchor.x}%`,
    "--anchor-y": `${anchor.y}%`,
  };
}

export function HardwareInteractionOverlay({
  hoveredTarget,
  interaction,
  interactionReady,
  locale,
  onClose,
  onRamFocusClose,
  ramFocusActive,
}: HardwareInteractionOverlayProps) {
  const copy = UI_COPY[locale].hardware;
  const hoverContent = hoveredTarget ? copy.hover[hoveredTarget.kind] : null;
  const ramContent =
    interaction?.kind === "ram"
      ? (copy.ram[interaction.ramIndex] ?? copy.ram[0])
      : null;

  return (
    <div
      className="hardware-interaction-layer"
      data-ready={interactionReady ? "true" : "false"}
    >
      {hoveredTarget && hoverContent && !interaction ? (
        <div
          aria-live="polite"
          className="component-hover-hud"
          data-kind={hoveredTarget.kind}
          style={getAnchorStyle(hoveredTarget.anchor)}
        >
          <span>{hoverContent.title}</span>
          <strong>{hoverContent.action}</strong>
        </div>
      ) : null}

      {interaction?.kind === "ram" && ramContent ? (
        <aside
          aria-label={copy.ramLabel(interaction.ramIndex + 1)}
          aria-modal="false"
          className="ram-module-panel"
          role="dialog"
          style={getAnchorStyle(interaction.anchor)}
        >
          <span className="ram-panel-connector" aria-hidden="true" />
          <div className="ram-panel-header">
            <p>MEMORY / {String(interaction.ramIndex + 1).padStart(2, "0")}</p>
            <button
              aria-label={copy.closeRam}
              className="interaction-close"
              onClick={onClose}
              type="button"
            >
              ×
            </button>
          </div>
          <h2>{ramContent.code}</h2>
          <div className="ram-panel-data">
            <span>{copy.moduleActive}</span>
            <span>{copy.memory}</span>
          </div>
          <p className="ram-panel-copy">{ramContent.text}</p>
        </aside>
      ) : null}

      {interaction?.kind === "cooler" ? (
        <div
          aria-label={copy.cooling.label}
          aria-modal="true"
          className="cooling-system-view"
          role="dialog"
        >
          <button
            aria-label={copy.closeCooling}
            className="interaction-close cooling-system-close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
          <section className="cooling-system-content">
            <p>{copy.cooling.live}</p>
            <h2>{copy.cooling.title}</h2>
            <div className="cooling-system-rule" aria-hidden="true" />
            <dl>
              <div>
                <dt>{copy.cooling.loop}</dt>
                <dd>{copy.cooling.loopValue}</dd>
              </div>
              <div>
                <dt>{copy.cooling.status}</dt>
                <dd>{copy.cooling.statusValue}</dd>
              </div>
              <div>
                <dt>{copy.cooling.profile}</dt>
                <dd>{copy.cooling.profileValue}</dd>
              </div>
            </dl>
            <p className="cooling-system-copy">{copy.cooling.copy}</p>
          </section>
        </div>
      ) : null}

      {ramFocusActive && !interaction ? (
        <button
          aria-label={copy.returnLabel}
          className="hardware-scene-return ram-focus-return"
          onClick={onRamFocusClose}
          type="button"
        >
          <span aria-hidden="true">←</span>
          {copy.returnToScene}
        </button>
      ) : null}

      {interaction?.kind === "gpu" ? (
        <button
          className="hardware-scene-return"
          onClick={onClose}
          type="button"
        >
          <span aria-hidden="true">←</span>
          {copy.returnToScene}
        </button>
      ) : null}
    </div>
  );
}
