"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

const clamp = (value: number) =>
  Math.min(1, Math.max(0, value));

function getScene(progress: number) {
  if (progress < 0.18) return 0;
  if (progress < 0.42) return 1;
  if (progress < 0.72) return 2;

  return 3;
}

function drawProcessor(
  canvas: HTMLCanvasElement,
  progress: number,
) {
  const rect =
    canvas.getBoundingClientRect();

  if (
    rect.width === 0 ||
    rect.height === 0
  ) {
    return;
  }

  const dpr = Math.min(
    window.devicePixelRatio || 1,
    1.5,
  );

  const targetWidth = Math.floor(
    rect.width * dpr,
  );

  const targetHeight = Math.floor(
    rect.height * dpr,
  );

  if (
    canvas.width !== targetWidth ||
    canvas.height !== targetHeight
  ) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  const context =
    canvas.getContext("2d");

  if (!context) return;

  const width = rect.width;
  const height = rect.height;

  context.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0,
  );

  context.clearRect(
    0,
    0,
    width,
    height,
  );

  /*
   * BACKGROUND
   */

  context.fillStyle = "#020304";

  context.fillRect(
    0,
    0,
    width,
    height,
  );

  const backgroundGlow =
    context.createRadialGradient(
      width * 0.56,
      height * 0.48,
      0,
      width * 0.56,
      height * 0.48,
      Math.max(width, height) * 0.72,
    );

  backgroundGlow.addColorStop(
    0,
    "rgba(63, 155, 180, 0.13)",
  );

  backgroundGlow.addColorStop(
    0.4,
    "rgba(16, 43, 51, 0.07)",
  );

  backgroundGlow.addColorStop(
    1,
    "rgba(0, 0, 0, 0)",
  );

  context.fillStyle =
    backgroundGlow;

  context.fillRect(
    0,
    0,
    width,
    height,
  );

  /*
   * PROCESSOR
   */

  const approach = clamp(
    progress / 0.37,
  );

  const processorOpacity =
    1 -
    clamp(
      (progress - 0.32) / 0.16,
    );

  const baseSize = Math.min(
    width,
    height,
  );

  const processorWidth =
    baseSize * 0.48;

  const processorHeight =
    processorWidth * 0.64;

  const scale =
    0.65 +
    Math.pow(approach, 2) * 4.7;

  context.save();

  context.translate(
    width / 2,
    height / 2,
  );

  context.scale(
    scale,
    scale,
  );

  context.globalAlpha =
    processorOpacity;

  /*
   * OUTER CHIP
   */

  context.fillStyle = "#090d0f";
  context.strokeStyle = "#41515a";
  context.lineWidth = 1;

  context.fillRect(
    -processorWidth / 2,
    -processorHeight / 2,
    processorWidth,
    processorHeight,
  );

  context.strokeRect(
    -processorWidth / 2,
    -processorHeight / 2,
    processorWidth,
    processorHeight,
  );

  /*
   * DIE
   */

  const dieWidth =
    processorWidth * 0.62;

  const dieHeight =
    processorHeight * 0.55;

  context.fillStyle = "#0a1418";

  context.strokeStyle =
    "rgba(148, 211, 225, 0.32)";

  context.fillRect(
    -dieWidth / 2,
    -dieHeight / 2,
    dieWidth,
    dieHeight,
  );

  context.strokeRect(
    -dieWidth / 2,
    -dieHeight / 2,
    dieWidth,
    dieHeight,
  );

  /*
   * CHIP LINES
   */

  context.strokeStyle =
    "rgba(126, 171, 181, 0.19)";

  for (
    let index = 0;
    index < 12;
    index += 1
  ) {
    const y =
      -dieHeight / 2 +
      (dieHeight / 12) *
        index;

    context.beginPath();

    context.moveTo(
      -dieWidth / 2,
      y,
    );

    context.lineTo(
      dieWidth / 2,
      y,
    );

    context.stroke();
  }

  /*
   * CONTACTS
   */

  context.strokeStyle =
    "rgba(163, 185, 190, 0.28)";

  for (
    let index = 0;
    index < 10;
    index += 1
  ) {
    const x =
      -processorWidth / 2 +
      ((index + 0.5) / 10) *
        processorWidth;

    context.beginPath();

    context.moveTo(
      x,
      -processorHeight / 2 - 12,
    );

    context.lineTo(
      x,
      -processorHeight / 2,
    );

    context.moveTo(
      x,
      processorHeight / 2,
    );

    context.lineTo(
      x,
      processorHeight / 2 + 12,
    );

    context.stroke();
  }

  context.restore();

  /*
   * PROCESSOR INTERIOR
   */

  const insideProgress = clamp(
    (progress - 0.26) / 0.28,
  );

  if (insideProgress > 0) {
    context.save();

    context.globalAlpha =
      insideProgress;

    const centerX =
      width / 2;

    const centerY =
      height / 2;

    /*
     * DEPTH TUNNEL
     */

    for (
      let index = 0;
      index < 24;
      index += 1
    ) {
      const normalized =
        (
          index / 24 +
          progress * 1.35
        ) %
        1;

      const depth =
        Math.pow(
          normalized,
          2.2,
        );

      const boxWidth =
        35 +
        depth *
          width *
          1.45;

      const boxHeight =
        25 +
        depth *
          height *
          0.95;

      const alpha =
        0.025 +
        (1 - normalized) *
          0.13;

      context.strokeStyle =
        `rgba(121, 211, 231, ${alpha})`;

      context.lineWidth = 1;

      context.strokeRect(
        centerX -
          boxWidth / 2,
        centerY -
          boxHeight / 2,
        boxWidth,
        boxHeight,
      );
    }

    /*
     * CIRCUIT PATHS
     */

    for (
      let index = 0;
      index < 9;
      index += 1
    ) {
      const offset =
        (index - 4) *
        (height / 12);

      const movement =
        (
          progress * 420 +
          index * 51
        ) %
          200 -
        100;

      const active =
        index % 3 === 0;

      context.strokeStyle =
        active
          ? "rgba(120, 220, 239, 0.34)"
          : "rgba(109, 137, 145, 0.13)";

      context.lineWidth =
        active ? 1.3 : 1;

      context.beginPath();

      context.moveTo(
        0,
        centerY + offset,
      );

      context.lineTo(
        width * 0.22 +
          movement,
        centerY + offset,
      );

      context.lineTo(
        width * 0.34 +
          movement,
        centerY +
          offset * 0.4,
      );

      context.lineTo(
        width * 0.66 -
          movement,
        centerY +
          offset * 0.4,
      );

      context.lineTo(
        width * 0.78 -
          movement,
        centerY + offset,
      );

      context.lineTo(
        width,
        centerY + offset,
      );

      context.stroke();
    }

    context.restore();
  }

  /*
   * DIGITAL CORE
   */

  const coreProgress = clamp(
    (progress - 0.68) / 0.25,
  );

  if (coreProgress > 0) {
    const coreX =
      width * 0.52;

    const coreY =
      height * 0.5;

    const radius =
      14 +
      coreProgress *
        Math.min(
          width,
          height,
        ) *
        0.12;

    const glow =
      context.createRadialGradient(
        coreX,
        coreY,
        0,
        coreX,
        coreY,
        radius * 4,
      );

    glow.addColorStop(
      0,
      `rgba(179, 237, 249, ${
        coreProgress * 0.5
      })`,
    );

    glow.addColorStop(
      0.2,
      `rgba(68, 184, 210, ${
        coreProgress * 0.24
      })`,
    );

    glow.addColorStop(
      1,
      "rgba(17, 62, 78, 0)",
    );

    context.fillStyle = glow;

    context.fillRect(
      coreX -
        radius * 4,
      coreY -
        radius * 4,
      radius * 8,
      radius * 8,
    );

    context.beginPath();

    context.arc(
      coreX,
      coreY,
      radius,
      0,
      Math.PI * 2,
    );

    context.fillStyle =
      `rgba(86, 187, 212, ${
        0.12 +
        coreProgress * 0.18
      })`;

    context.fill();

    context.strokeStyle =
      `rgba(182, 232, 243, ${
        0.25 +
        coreProgress * 0.55
      })`;

    context.lineWidth = 1;

    context.stroke();
  }

  /*
   * VIGNETTE
   */

  const vignette =
    context.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(
        width,
        height,
      ) * 0.2,
      width / 2,
      height / 2,
      Math.max(
        width,
        height,
      ) * 0.75,
    );

  vignette.addColorStop(
    0,
    "rgba(0, 0, 0, 0)",
  );

  vignette.addColorStop(
    1,
    "rgba(0, 0, 0, 0.75)",
  );

  context.fillStyle =
    vignette;

  context.fillRect(
    0,
    0,
    width,
    height,
  );
}

export function CinematicExperience() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [progress, setProgress] = useState(0);

  const scene = getScene(progress);

  useEffect(() => {
    let animationFrame = 0;

    const updateExperience = () => {
      animationFrame = 0;

      /*
       * Browser'ın gerçek scroll değerini alıyoruz.
       */
      const scrollTop =
        window.scrollY ||
        document.documentElement.scrollTop ||
        0;

      /*
       * Sayfada scroll edilebilecek toplam mesafe.
       */
      const maxScroll =
        document.documentElement.scrollHeight -
        window.innerHeight;

      const nextProgress =
        maxScroll > 0
          ? clamp(scrollTop / maxScroll)
          : 0;

      setProgress(nextProgress);

      const canvas = canvasRef.current;

      if (canvas) {
        drawProcessor(canvas, nextProgress);
      }
    };

    const handleScroll = () => {
      if (animationFrame !== 0) {
        return;
      }

      animationFrame =
        window.requestAnimationFrame(
          updateExperience,
        );
    };

    window.addEventListener(
      "scroll",
      handleScroll,
      { passive: true },
    );

    window.addEventListener(
      "resize",
      handleScroll,
    );

    /*
     * Sayfa ilk açıldığında ilk frame'i çiz.
     */
    updateExperience();

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll,
      );

      window.removeEventListener(
        "resize",
        handleScroll,
      );

      if (animationFrame !== 0) {
        window.cancelAnimationFrame(
          animationFrame,
        );
      }
    };
  }, []);

  return (
    <section className="cinematic-scroll">
      <div className="cinematic-viewport">
        <canvas
          ref={canvasRef}
          className="cinematic-canvas"
          aria-hidden="true"
        />

        <div
          className="cinematic-shade"
          aria-hidden="true"
        />

        <header className="cinematic-header">
          <div className="brand">
            RY<span>.</span>
          </div>

          <p>
            INSIDE THE DIGITAL MIND
          </p>
        </header>

        <div className="cinematic-progress">
          SYSTEM{" "}
          <span>
            {String(
              Math.round(
                progress * 100,
              ),
            ).padStart(3, "0")}
            %
          </span>
        </div>

        <div className="cinematic-overlays">
          {/* SCENE 00 */}

          <section
            className={`cinematic-scene ${
              scene === 0
                ? "is-active"
                : ""
            }`}
          >
            <div>
              <p className="cinematic-label">
                RAMAZAN YILDIRIM
              </p>

              <h1>
                INSIDE THE
                <br />
                DIGITAL MIND
              </h1>

              <p className="cinematic-copy">
                Computer Engineer ·
                Artificial Intelligence ·
                Software · Intelligent
                Systems
              </p>

              <div className="scroll-command">
                <span>↓</span>
                SCROLL TO ENTER
              </div>
            </div>
          </section>

          {/* SCENE 01 */}

          <section
            className={`cinematic-scene ${
              scene === 1
                ? "is-active"
                : ""
            }`}
          >
            <div>
              <p className="cinematic-label">
                01 / SYSTEM BOOT
              </p>

              <h2>
                ENTERING
                <br />
                THE PROCESSOR
              </h2>

              <p className="cinematic-copy">
                Moving beyond the
                surface.
              </p>
            </div>
          </section>

          {/* SCENE 02 */}

          <section
            className={`cinematic-scene ${
              scene === 2
                ? "is-active"
                : ""
            }`}
          >
            <div>
              <p className="cinematic-label">
                02 / DIGITAL ARCHITECTURE
              </p>

              <h2>
                ENGINEERING
                <br />
                MEETS
                <br />
                INTELLIGENCE.
              </h2>

              <p className="cinematic-copy">
                Building at the
                intersection of software,
                artificial intelligence
                and intelligent systems.
              </p>
            </div>
          </section>

          {/* SCENE 03 */}

          <section
            className={`cinematic-scene cinematic-scene-core ${
              scene === 3
                ? "is-active"
                : ""
            }`}
          >
            <div>
              <p className="cinematic-label">
                03 / CORE
              </p>

              <h2>
                DIGITAL
                <br />
                MIND
              </h2>

              <p className="cinematic-copy">
                The journey has only
                started.
              </p>
            </div>
          </section>
        </div>
      </div>

      <div
        className="cinematic-spacer"
        aria-hidden="true"
      />
    </section>
  );
}