import { CoreSequenceStatus } from "@/components/sections/core-sequence-status";

export function CoreSequence() {
  return (
    <section id="ai-core" data-scroll-section="ai-core" className="core-sequence page-width" aria-labelledby="core-sequence-title">
      <div className="core-sequence-sticky">
        <div className="core-sequence-copy">
          <p className="section-label eyebrow"><span>02</span> / AI CORE</p>
          <h2 id="core-sequence-title">From stillness<br />to possibility.</h2>
          <p className="section-description">A spark of energy. A shift in perspective.</p>
          <CoreSequenceStatus />
        </div>
      </div>
      <noscript>
        <style>{`.core-sequence { min-height: auto !important; } .core-sequence-sticky { min-height: auto !important; position: relative !important; top: auto !important; } .core-sequence-copy { min-height: auto !important; } .core-sequence-status { margin-top: 2rem !important; }`}</style>
      </noscript>
    </section>
  );
}
