import { NavigationLinks } from "@/components/layout/navigation-links";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="page-width header-inner">
        <a className="wordmark" href="#home" aria-label="Ramazan Yildirim, home">
          RY<span aria-hidden="true">.</span>
        </a>
        <nav aria-label="Main navigation">
          <NavigationLinks />
        </nav>
      </div>
    </header>
  );
}
