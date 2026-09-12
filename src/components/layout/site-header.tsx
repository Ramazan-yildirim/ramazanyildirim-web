import { navigation } from "@/data/site";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="page-width header-inner">
        <a className="wordmark" href="#home" aria-label="Ramazan Yildirim, home">
          RY<span aria-hidden="true">.</span>
        </a>
        <nav aria-label="Main navigation">
          <ul className="navigation">
            {navigation.map((item) => (
              <li key={item.href}><a href={item.href}>{item.label}</a></li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
