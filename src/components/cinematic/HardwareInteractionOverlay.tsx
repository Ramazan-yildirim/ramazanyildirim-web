"use client";

import type { CSSProperties } from "react";
import type {
  SceneHover,
  SceneInteraction,
  ScreenAnchor,
} from "./scene-interaction";

type HardwareInteractionOverlayProps = {
  hoveredTarget: SceneHover | null;
  interaction: SceneInteraction;
  interactionReady: boolean;
  onClose: () => void;
};

type AnchorStyle = CSSProperties & {
  "--anchor-x": string;
  "--anchor-y": string;
};

const HOVER_CONTENT = {
  cooler: {
    action: "OPEN",
    title: "SYSTEM MONITOR",
  },
  gpu: {
    action: "AI SYSTEM",
    title: "GRAPHICS MODULE",
  },
  ram: {
    action: "SELECT",
    title: "MEMORY MODULE",
  },
} as const;

const RAM_CONTENT = [
  {
    code: "ABOUT",
    text: "Kişisel profil, çalışma yaklaşımı ve üretim odağı.",
  },
  {
    code: "EXPERIENCE",
    text: "Deneyimler, sorumluluklar ve tamamlanan çalışmalar.",
  },
  {
    code: "PROJECTS",
    text: "Seçilmiş projeler, teknik kararlar ve geliştirme süreçleri.",
  },
  {
    code: "SKILLS / TECHNOLOGY",
    text: "Kullanılan teknolojiler, araçlar ve teknik yetkinlikler.",
  },
] as const;

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
  onClose,
}: HardwareInteractionOverlayProps) {
  const hoverContent = hoveredTarget ? HOVER_CONTENT[hoveredTarget.kind] : null;
  const ramContent =
    interaction?.kind === "ram"
      ? (RAM_CONTENT[interaction.ramIndex] ?? RAM_CONTENT[0])
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
          aria-label={`RAM ${interaction.ramIndex + 1} bilgi paneli`}
          aria-modal="false"
          className="ram-module-panel"
          role="dialog"
          style={getAnchorStyle(interaction.anchor)}
        >
          <span className="ram-panel-connector" aria-hidden="true" />
          <div className="ram-panel-header">
            <p>MEMORY / {String(interaction.ramIndex + 1).padStart(2, "0")}</p>
            <button
              aria-label="RAM bilgi panelini kapat"
              className="interaction-close"
              onClick={onClose}
              type="button"
            >
              ×
            </button>
          </div>
          <h2>{ramContent.code}</h2>
          <div className="ram-panel-data">
            <span>MODULE ACTIVE</span>
            <span>DDR MEMORY</span>
          </div>
          <p className="ram-panel-copy">{ramContent.text}</p>
        </aside>
      ) : null}

      {interaction?.kind === "cooler" ? (
        <div
          aria-label="Sıvı soğutma sistem bilgileri"
          aria-modal="true"
          className="cooling-system-view"
          role="dialog"
        >
          <button
            aria-label="Sistem ekranını kapat"
            className="interaction-close cooling-system-close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
          <section className="cooling-system-content">
            <p>THERMAL SYSTEM / LIVE</p>
            <h2>SYSTEM MONITOR</h2>
            <div className="cooling-system-rule" aria-hidden="true" />
            <dl>
              <div>
                <dt>LOOP</dt>
                <dd>LIQUID COOLING</dd>
              </div>
              <div>
                <dt>STATUS</dt>
                <dd>ACTIVE</dd>
              </div>
              <div>
                <dt>PROFILE</dt>
                <dd>BALANCED</dd>
              </div>
            </dl>
            <p className="cooling-system-copy">
              Sistem bilgileri, canlı değerler ve proje detayları için ayrılmış
              izleme arayüzü.
            </p>
          </section>
        </div>
      ) : null}

      {interaction?.kind === "gpu" ? (
        <button
          className="hardware-scene-return"
          onClick={onClose}
          type="button"
        >
          <span aria-hidden="true">←</span>
          SAHNEYE DÖN
        </button>
      ) : null}
    </div>
  );
}
