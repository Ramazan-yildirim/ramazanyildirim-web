"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import {
  CONTACT_PORT_COLOR,
  CONTACT_PROFILE,
  EXTERNAL_REAR_PORT_IDS,
  REAR_PORT_LINKS,
} from "./contact-links";
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

type PortButtonStyle = CSSProperties & {
  "--port-color": string;
  "--port-index": number;
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
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const senderEmail = String(formData.get("email") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();
    const subject =
      locale === "tr"
        ? "Portfolyo iletişim mesajı — " + name
        : "Portfolio contact message — " + name;
    const body =
      locale === "tr"
        ? "Gönderen: " +
          name +
          "\nE-posta: " +
          senderEmail +
          "\n\n" +
          message
        : "From: " +
          name +
          "\nEmail: " +
          senderEmail +
          "\n\n" +
          message;

    setFormSubmitted(true);
    window.location.href =
      CONTACT_PROFILE.emailHref +
      "?subject=" +
      encodeURIComponent(subject) +
      "&body=" +
      encodeURIComponent(body);
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
        {EXTERNAL_REAR_PORT_IDS.map((portId, index) => {
          const port = REAR_PORT_LINKS[portId];

          return (
            <button
              aria-label={copy.portAria(port.label)}
              key={portId}
              onClick={() => onSelectPort(portId)}
              style={
                {
                  "--port-color": port.color,
                  "--port-index": index,
                } as PortButtonStyle
              }
              title={port.value}
              type="button"
            >
              <span>{port.signal}</span>
              <strong>{port.label}</strong>
              <i aria-hidden="true" />
            </button>
          );
        })}
        <button
          aria-label={copy.portAria(copy.contact)}
          onClick={onOpenContact}
          style={
            {
              "--port-color": CONTACT_PORT_COLOR,
              "--port-index": EXTERNAL_REAR_PORT_IDS.length,
            } as PortButtonStyle
          }
          type="button"
        >
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
          <nav aria-label={copy.detailsLabel} className="rear-contact-links">
            <a href={CONTACT_PROFILE.emailHref}>
              <span>{copy.email}</span>
              <strong>{CONTACT_PROFILE.email}</strong>
              <i aria-hidden="true">↗</i>
            </a>
            {(["linkedin", "github", "instagram", "location"] as const).map(
              (portId) => {
                const port = REAR_PORT_LINKS[portId];

                return (
                  <a
                    href={port.href}
                    key={portId}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span>
                      {portId === "location" ? copy.location : port.label}
                    </span>
                    <strong>{port.value}</strong>
                    <i aria-hidden="true">↗</i>
                  </a>
                );
              },
            )}
          </nav>
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
