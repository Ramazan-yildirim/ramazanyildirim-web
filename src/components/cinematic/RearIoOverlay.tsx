"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { UI_COPY, type Locale } from "./i18n";
import type {
  RearPortHover,
  RearPortId,
  ScreenAnchor,
} from "./scene-interaction";

type RearIoOverlayProps = {
  contactOpen: boolean;
  hoveredPort: RearPortHover | null;
  locale: Locale;
  onCloseContact: () => void;
  onOpenContact: () => void;
  onSelectPort: (portId: RearPortId) => void;
  ready: boolean;
  selectedPort: RearPortId | null;
};

type AnchorStyle = CSSProperties & {
  "--anchor-x": string;
  "--anchor-y": string;
};

const SOCIAL_PORTS = [
  { id: "github", label: "GITHUB", signal: "DEV / 01" },
  { id: "linkedin", label: "LINKEDIN", signal: "WORK / 02" },
  { id: "instagram", label: "INSTAGRAM", signal: "SOCIAL / 03" },
  { id: "x", label: "X / TWITTER", signal: "FEED / 04" },
] satisfies ReadonlyArray<{
  id: Exclude<RearPortId, "contact">;
  label: string;
  signal: string;
}>;

function getAnchorStyle(anchor: ScreenAnchor): AnchorStyle {
  return {
    "--anchor-x": `${anchor.x}%`,
    "--anchor-y": `${anchor.y}%`,
  };
}

export function RearIoOverlay({
  contactOpen,
  hoveredPort,
  locale,
  onCloseContact,
  onOpenContact,
  onSelectPort,
  ready,
  selectedPort,
}: RearIoOverlayProps) {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const copy = UI_COPY[locale].rear;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormSubmitted(true);
  };

  if (!ready) return null;

  return (
    <div
      className="rear-io-layer"
      data-contact-open={contactOpen ? "true" : "false"}
      data-ready="true"
    >
      <div className="rear-io-heading">
        <p>{copy.prefix}</p>
        <h2>{copy.heading}</h2>
        <span>{copy.instruction}</span>
      </div>

      <nav aria-label={copy.navLabel} className="rear-port-dock">
        {SOCIAL_PORTS.map((port, index) => (
          <button
            aria-label={copy.portAria(port.label)}
            key={port.id}
            onClick={() => onSelectPort(port.id)}
            style={{ "--port-index": index } as CSSProperties}
            type="button"
          >
            <span>{port.signal}</span>
            <strong>{port.label}</strong>
            <i aria-hidden="true" />
          </button>
        ))}
        <button onClick={onOpenContact} type="button">
          <span>DIRECT / 05</span>
          <strong>{copy.contact}</strong>
          <i aria-hidden="true" />
        </button>
      </nav>

      {selectedPort && selectedPort !== "contact" ? (
        <output className="rear-port-status">
          {copy.portLabels[selectedPort]} / {copy.urlPending}
        </output>
      ) : null}

      {hoveredPort && !contactOpen ? (
        <div
          aria-live="polite"
          className="rear-port-hud"
          style={getAnchorStyle(hoveredPort.anchor)}
        >
          <span>{copy.online}</span>
          <strong>{copy.portLabels[hoveredPort.id]}</strong>
        </div>
      ) : null}

      {contactOpen ? (
        <aside
          aria-label={copy.contactLabel}
          aria-modal="true"
          className="rear-contact-panel"
          role="dialog"
        >
          <button
            aria-label={copy.closeContact}
            className="interaction-close rear-contact-close"
            onClick={onCloseContact}
            type="button"
          >
            ×
          </button>
          <p>DIRECT CHANNEL / 05</p>
          <h2>{copy.contactHeading}</h2>
          <form onSubmit={handleSubmit}>
            <label>
              <span>{copy.name}</span>
              <input autoComplete="name" name="name" required type="text" />
            </label>
            <label>
              <span>{copy.email}</span>
              <input
                autoComplete="email"
                name="email"
                required
                type="email"
              />
            </label>
            <label>
              <span>{copy.message}</span>
              <textarea name="message" required rows={5} />
            </label>
            <button className="rear-contact-submit" type="submit">
              {copy.send} <span aria-hidden="true">↗</span>
            </button>
            <output aria-live="polite">
              {formSubmitted ? copy.formStatus : ""}
            </output>
          </form>
        </aside>
      ) : null}
    </div>
  );
}
