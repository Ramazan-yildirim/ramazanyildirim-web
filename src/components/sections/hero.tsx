export function Hero() {
  return (
    <section id="home" className="hero page-width" aria-labelledby="hero-title">
      <div className="hero-topline eyebrow">
        <p><span className="status-dot" aria-hidden="true" /> PERSONAL DIGITAL SPACE</p>
        <p>00 / SYSTEM BOOT</p>
      </div>
      <div className="hero-main">
        <p className="eyebrow hero-kicker">RAMAZAN <span>{"//"}</span> DIGITAL MIND</p>
        <h1 id="hero-title">RAMAZAN<br /><span>YILDIRIM</span></h1>
        <div className="hero-description">
          <p>Computer Engineer</p>
          <p>AI <span>·</span> Software <span>·</span> Intelligent Systems</p>
        </div>
      </div>
      <div className="hero-bottom">
        <a className="initialize-link eyebrow" href="#identity">
          <span className="scroll-arrow" aria-hidden="true">↓</span>
          SCROLL TO INITIALIZE
        </a>
        <p className="eyebrow hero-footnote">HUMAN CURIOSITY. DIGITAL POSSIBILITIES.</p>
      </div>
    </section>
  );
}
