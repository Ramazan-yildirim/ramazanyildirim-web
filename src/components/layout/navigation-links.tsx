"use client";

import { navigation } from "@/data/site";
import { useScrollSelector } from "@/components/layout/scroll-experience";

export function NavigationLinks() {
  const activeSection = useScrollSelector((state) => state.activeSection);
  const activeLink = (activeSection === "identity" || activeSection === "ai-core") ? "home" : activeSection;

  return (
    <ul className="navigation">
      {navigation.map((item) => (
        <li key={item.href}>
          <a href={item.href} aria-current={item.href === `#${activeLink}` ? "location" : undefined}>
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
