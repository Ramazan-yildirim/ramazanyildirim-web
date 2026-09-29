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

type TerminalTitlebarProps = {
  closeLabel: string;
  onClose: () => void;
};

function TerminalTitlebar({ closeLabel, onClose }: TerminalTitlebarProps) {
  return (
    <header className="terminal-titlebar">
      <div className="terminal-tab">
        <span aria-hidden="true" className="terminal-powershell-icon">
          &gt;_
        </span>
        <p>Windows PowerShell</p>
      </div>
      <span aria-hidden="true" className="terminal-new-tab">
        +
      </span>
      <div className="terminal-window-actions">
        <i aria-hidden="true" />
        <i aria-hidden="true" />
        <button
          aria-label={closeLabel}
          className="interaction-close terminal-window-close"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </div>
    </header>
  );
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
        >
          <span className="ram-panel-connector" aria-hidden="true" />
          <div className="ram-terminal-frame terminal-window">
            <TerminalTitlebar closeLabel={copy.closeRam} onClose={onClose} />
            <div className="ram-terminal-output">
              <p className="ram-terminal-command">
                <strong>PS C:\Portfolio\Memory&gt;</strong>{" "}
                Get-MemoryProfile -Slot{" "}
                {String(interaction.ramIndex + 1).padStart(2, "0")}
              </p>
              <div className="ram-panel-data">
                <span>
                  <b>DeviceLocator</b><i>:</i>
                  DIMM_{String(interaction.ramIndex + 1).padStart(2, "0")}
                </span>
                <span>
                  <b>MemoryType</b><i>:</i>
                  {copy.memory}
                </span>
                <span>
                  <b>Status</b><i>:</i>
                  <em>{copy.moduleActive}</em>
                </span>
              </div>
              <h2>
                <span aria-hidden="true">./</span>
                {ramContent.code}
              </h2>
              <p className="ram-panel-copy">{ramContent.text}</p>
            </div>
            <div className="ram-terminal-footer" aria-hidden="true">
              <strong>PS C:\Portfolio\Memory&gt;</strong>
              <i />
            </div>
          </div>
        </aside>
      ) : null}

      {interaction?.kind === "cooler" ? (
        <div
          aria-label={copy.cooling.label}
          aria-modal="true"
          className="cooling-system-view"
          role="dialog"
        >
          <section className="cooling-system-content terminal-window">
            <TerminalTitlebar
              closeLabel={copy.closeCooling}
              onClose={onClose}
            />
            <div className="cooling-terminal-output">
              <p className="cooling-terminal-command">
                <strong>PS C:\Portfolio\Thermals&gt;</strong>{" "}
                Get-CoolingProfile
              </p>
              <p className="cooling-terminal-session">{copy.cooling.live}</p>
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
            </div>
            <div className="ram-terminal-footer" aria-hidden="true">
              <strong>PS C:\Portfolio\Thermals&gt;</strong>
              <i />
            </div>
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
