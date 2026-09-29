export const CONTACT_PROFILE = {
  email: "ramazanyldr0103@gmail.com",
  emailHref: "mailto:ramazanyldr0103@gmail.com",
  location: "Türkiye / Afyonkarahisar",
  locationHref:
    "https://www.google.com/maps/search/?api=1&query=Afyonkarahisar%2C%20T%C3%BCrkiye",
} as const;

export const REAR_PORT_LINKS = {
  github: {
    color: "#f0f6fc",
    href: "https://github.com/Ramazan-yildirim",
    label: "GITHUB",
    signal: "DEV / 01",
    value: "github.com/Ramazan-yildirim",
  },
  linkedin: {
    color: "#2f81f7",
    href: "https://www.linkedin.com/in/ramazanyldr/",
    label: "LINKEDIN",
    signal: "WORK / 02",
    value: "linkedin.com/in/ramazanyldr",
  },
  instagram: {
    color: "#ff4f9a",
    href: "https://www.instagram.com/ramazan.yiildirim/",
    label: "INSTAGRAM",
    signal: "SOCIAL / 03",
    value: "instagram.com/ramazan.yiildirim",
  },
  location: {
    color: "#f6c344",
    href: CONTACT_PROFILE.locationHref,
    label: "LOCATION",
    signal: "LOC / 04",
    value: CONTACT_PROFILE.location,
  },
} as const;

export const CONTACT_PORT_COLOR = "#50e6ff";

export const REAR_PORT_COLORS = {
  contact: CONTACT_PORT_COLOR,
  github: REAR_PORT_LINKS.github.color,
  instagram: REAR_PORT_LINKS.instagram.color,
  linkedin: REAR_PORT_LINKS.linkedin.color,
  location: REAR_PORT_LINKS.location.color,
} as const;

export const EXTERNAL_REAR_PORT_IDS = [
  "github",
  "linkedin",
  "instagram",
  "location",
] as const;
