"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import type {
  RearPortHover,
  RearPortId,
  ScreenAnchor,
} from "./scene-interaction";

type RearIoOverlayProps = {
  contactOpen: boolean;
  hoveredPort: RearPortHover | null;
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

const PORT_LABELS: Record<RearPortId, string> = {
  contact: "CONTACT CHANNEL",
  github: "GITHUB UPLINK",
  instagram: "INSTAGRAM FEED",
  linkedin: "LINKEDIN NETWORK",
  x: "X / TWITTER FEED",
};

function getAnchorStyle(anchor: ScreenAnchor): AnchorStyle {
  return {
    "--anchor-x": `${anchor.x}%`,
    "--anchor-y": `${anchor.y}%`,
  };
}

export function RearIoOverlay({
  contactOpen,
  hoveredPort,
  onCloseContact,
  onOpenContact,
  onSelectPort,
  ready,
  selectedPort,
}: RearIoOverlayProps) {
  const [formStatus, setFormStatus] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormStatus("Gönderim adresi bağlandığında mesajın hazır olacak.");
  };

  if (!ready) return null;

  return (
    <div
      className="rear-io-layer"
      data-contact-open={contactOpen ? "true" : "false"}
      data-ready="true"
    >
      <div className="rear-io-heading">
        <p>REAR I/O / CONNECTION ARRAY</p>
        <h2>LET&apos;S CONNECT</h2>
        <span>Bir porta dokun ve bağlantıyı başlat.</span>
      </div>

      <nav aria-label="Sosyal medya bağlantıları" className="rear-port-dock">
        {SOCIAL_PORTS.map((port, index) => (
          <button
            aria-label={`${port.label} bağlantısı`}
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
          <strong>CONTACT</strong>
          <i aria-hidden="true" />
        </button>
      </nav>

      {selectedPort && selectedPort !== "contact" ? (
        <output className="rear-port-status">
          {PORT_LABELS[selectedPort]} / BAĞLANTI ADRESİ BEKLENİYOR
        </output>
      ) : null}

      {hoveredPort && !contactOpen ? (
        <div
          aria-live="polite"
          className="rear-port-hud"
          style={getAnchorStyle(hoveredPort.anchor)}
        >
          <span>PORT ONLINE</span>
          <strong>{PORT_LABELS[hoveredPort.id]}</strong>
        </div>
      ) : null}

      {contactOpen ? (
        <aside
          aria-label="İletişim formu"
          aria-modal="true"
          className="rear-contact-panel"
          role="dialog"
        >
          <button
            aria-label="İletişim formunu kapat"
            className="interaction-close rear-contact-close"
            onClick={onCloseContact}
            type="button"
          >
            ×
          </button>
          <p>DIRECT CHANNEL / 05</p>
          <h2>MESAJ GÖNDER</h2>
          <form onSubmit={handleSubmit}>
            <label>
              <span>ADINIZ</span>
              <input autoComplete="name" name="name" required type="text" />
            </label>
            <label>
              <span>E-POSTA</span>
              <input
                autoComplete="email"
                name="email"
                required
                type="email"
              />
            </label>
            <label>
              <span>MESAJ</span>
              <textarea name="message" required rows={5} />
            </label>
            <button className="rear-contact-submit" type="submit">
              MESAJI HAZIRLA <span aria-hidden="true">↗</span>
            </button>
            <output aria-live="polite">{formStatus}</output>
          </form>
        </aside>
      ) : null}
    </div>
  );
}
