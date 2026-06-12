import { startTransition, useEffect, useRef, useState } from 'react';
import projects from '../data/projects.json';

type PushArticle = (typeof projects.pushArticles)[number];

const FRICTION = 0.9;
const WHEEL_SENS = 18;
const DRAG_SENS = 1;
const GAP = 34;
const MAX_ROTATION = 28;
const MAX_DEPTH = 180;
const MIN_SCALE = 0.9;
const SCALE_RANGE = 0.28;

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

function shortestDelta(from: number, to: number, track: number) {
  return mod(to - from + track / 2, track) - track / 2;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }

    h /= 6;
  }

  return [h * 360, s, l] as const;
}

function hslToRgb(h: number, s: number, l: number) {
  let hue = ((h % 360) + 360) % 360;
  hue /= 360;

  if (s === 0) {
    const gray = Math.round(l * 255);
    return [gray, gray, gray] as const;
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const hueToRgb = (t: number) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };

  return [
    Math.round(hueToRgb(hue + 1 / 3) * 255),
    Math.round(hueToRgb(hue) * 255),
    Math.round(hueToRgb(hue - 1 / 3) * 255),
  ] as const;
}

function fallbackPalette(index: number) {
  const hue = (index * 41) % 360;
  return {
    c1: hslToRgb(hue, 0.72, 0.58),
    c2: hslToRgb(hue + 28, 0.68, 0.76),
  };
}

function extractPalette(image: HTMLImageElement, index: number) {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context || !image.naturalWidth || !image.naturalHeight) {
      return fallbackPalette(index);
    }

    const maxSize = 48;
    const ratio = image.naturalWidth / image.naturalHeight;
    const width = ratio >= 1 ? maxSize : Math.max(16, Math.round(maxSize * ratio));
    const height = ratio >= 1 ? Math.max(16, Math.round(maxSize / ratio)) : maxSize;

    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);
    const data = context.getImageData(0, 0, width, height).data;

    const hueBins = 36;
    const satBins = 5;
    const size = hueBins * satBins;
    const weights = new Float32Array(size);
    const reds = new Float32Array(size);
    const greens = new Float32Array(size);
    const blues = new Float32Array(size);

    for (let pointer = 0; pointer < data.length; pointer += 4) {
      const alpha = data[pointer + 3] / 255;
      if (alpha < 0.05) continue;

      const red = data[pointer];
      const green = data[pointer + 1];
      const blue = data[pointer + 2];
      const [hue, saturation, lightness] = rgbToHsl(red, green, blue);

      if (lightness < 0.1 || lightness > 0.92 || saturation < 0.08) continue;

      const weight = alpha * saturation * saturation * (1 - Math.abs(lightness - 0.5) * 0.65);
      const hueIndex = clamp(Math.floor((hue / 360) * hueBins), 0, hueBins - 1);
      const satIndex = clamp(Math.floor(saturation * satBins), 0, satBins - 1);
      const bin = hueIndex * satBins + satIndex;

      weights[bin] += weight;
      reds[bin] += red * weight;
      greens[bin] += green * weight;
      blues[bin] += blue * weight;
    }

    let primaryIndex = -1;
    let primaryWeight = 0;

    for (let indexPointer = 0; indexPointer < size; indexPointer += 1) {
      if (weights[indexPointer] > primaryWeight) {
        primaryWeight = weights[indexPointer];
        primaryIndex = indexPointer;
      }
    }

    if (primaryIndex < 0 || primaryWeight <= 0) {
      return fallbackPalette(index);
    }

    const averageColor = (bin: number) => {
      const weight = weights[bin] || 1e-6;
      return [
        Math.round(reds[bin] / weight),
        Math.round(greens[bin] / weight),
        Math.round(blues[bin] / weight),
      ] as const;
    };

    const primaryHue = Math.floor(primaryIndex / satBins) * (360 / hueBins);
    let secondaryIndex = -1;
    let secondaryWeight = 0;

    for (let indexPointer = 0; indexPointer < size; indexPointer += 1) {
      if (weights[indexPointer] <= 0) continue;

      const hue = Math.floor(indexPointer / satBins) * (360 / hueBins);
      let deltaHue = Math.abs(hue - primaryHue);
      deltaHue = Math.min(deltaHue, 360 - deltaHue);

      if (deltaHue >= 25 && weights[indexPointer] > secondaryWeight) {
        secondaryWeight = weights[indexPointer];
        secondaryIndex = indexPointer;
      }
    }

    const [primaryRed, primaryGreen, primaryBlue] = averageColor(primaryIndex);
    const [hue1, saturation1] = rgbToHsl(primaryRed, primaryGreen, primaryBlue);
    const c1 = hslToRgb(hue1, Math.max(0.45, Math.min(1, saturation1 * 1.08)), 0.56);

    if (secondaryIndex >= 0 && secondaryWeight >= primaryWeight * 0.6) {
      const [secondaryRed, secondaryGreen, secondaryBlue] = averageColor(secondaryIndex);
      const [hue2, saturation2] = rgbToHsl(secondaryRed, secondaryGreen, secondaryBlue);
      return {
        c1,
        c2: hslToRgb(hue2, Math.max(0.42, Math.min(1, saturation2 * 1.02)), 0.76),
      };
    }

    return {
      c1,
      c2: hslToRgb(hue1 + 22, Math.max(0.45, Math.min(1, saturation1)), 0.78),
    };
  } catch {
    return fallbackPalette(index);
  }
}

export function PushArticlesPage() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const pointerIdRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const paletteRef = useRef<Array<{ c1: readonly number[]; c2: readonly number[] }>>(
    projects.pushArticles.map((_, index) => fallbackPalette(index)),
  );
  const gradientRef = useRef({
    current: { r1: 244, g1: 189, b1: 175, r2: 250, g2: 222, b2: 203 },
    target: { r1: 244, g1: 189, b1: 175, r2: 250, g2: 222, b2: 203 },
  });
  const stateRef = useRef({
    cardWidth: 320,
    cardHeight: 240,
    step: 274,
    track: projects.pushArticles.length * 274,
    scrollY: 0,
    velocity: 0,
    lastTime: 0,
    dragging: false,
    lastPointerY: 0,
    lastPointerTime: 0,
    snapTarget: null as number | null,
    activeIndex: 0,
    screenPositions: new Float32Array(projects.pushArticles.length),
  });
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;

    if (!stage || !canvas) {
      return;
    }

    const context = canvas.getContext('2d', { alpha: false });

    if (!context) {
      return;
    }

    const resizeCanvas = () => {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const rect = stage.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const measure = () => {
      const sample = cardRefs.current[0];
      const rect = sample?.getBoundingClientRect();
      const cardWidth = rect?.width || Math.min(window.innerWidth * 0.28, 360);
      const cardHeight = rect?.height || 220;
      const step = cardHeight + GAP;
      stateRef.current.cardWidth = cardWidth;
      stateRef.current.cardHeight = cardHeight;
      stateRef.current.step = step;
      stateRef.current.track = step * projects.pushArticles.length;
      stateRef.current.screenPositions = new Float32Array(projects.pushArticles.length);
    };

    const drawBackground = (time: number) => {
      const rect = stage.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const gradient = gradientRef.current;

      gradient.current.r1 += (gradient.target.r1 - gradient.current.r1) * 0.08;
      gradient.current.g1 += (gradient.target.g1 - gradient.current.g1) * 0.08;
      gradient.current.b1 += (gradient.target.b1 - gradient.current.b1) * 0.08;
      gradient.current.r2 += (gradient.target.r2 - gradient.current.r2) * 0.08;
      gradient.current.g2 += (gradient.target.g2 - gradient.current.g2) * 0.08;
      gradient.current.b2 += (gradient.target.b2 - gradient.current.b2) * 0.08;

      const [accentHue, accentSaturation] = rgbToHsl(
        gradient.current.r1,
        gradient.current.g1,
        gradient.current.b1,
      );
      const silhouette = hslToRgb(accentHue, Math.max(0.4, accentSaturation), 0.27);
      stage.style.setProperty(
        '--push-accent',
        `rgb(${Math.round(gradient.current.r1)} ${Math.round(gradient.current.g1)} ${Math.round(gradient.current.b1)})`,
      );
      stage.style.setProperty(
        '--push-accent-soft',
        `rgb(${Math.round(gradient.current.r2)} ${Math.round(gradient.current.g2)} ${Math.round(gradient.current.b2)})`,
      );
      stage.style.setProperty('--push-silhouette', `rgb(${silhouette[0]} ${silhouette[1]} ${silhouette[2]})`);

      context.fillStyle = '#f8f1e9';
      context.fillRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * 0.48;
      const timeFactor = time * 0.00022;
      const orbitA = Math.min(width, height) * 0.34;
      const orbitB = Math.min(width, height) * 0.26;
      const x1 = cx + Math.cos(timeFactor) * orbitA;
      const y1 = cy + Math.sin(timeFactor * 0.78) * orbitA * 0.42;
      const x2 = cx + Math.cos(-timeFactor * 0.92 + 1.15) * orbitB;
      const y2 = cy + Math.sin(-timeFactor * 0.72 + 0.72) * orbitB * 0.52;
      const radius1 = Math.max(width, height) * 0.72;
      const radius2 = Math.max(width, height) * 0.62;

      const radial1 = context.createRadialGradient(x1, y1, 0, x1, y1, radius1);
      radial1.addColorStop(
        0,
        `rgba(${Math.round(gradient.current.r1)}, ${Math.round(gradient.current.g1)}, ${Math.round(gradient.current.b1)}, 0.86)`,
      );
      radial1.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = radial1;
      context.fillRect(0, 0, width, height);

      const radial2 = context.createRadialGradient(x2, y2, 0, x2, y2, radius2);
      radial2.addColorStop(
        0,
        `rgba(${Math.round(gradient.current.r2)}, ${Math.round(gradient.current.g2)}, ${Math.round(gradient.current.b2)}, 0.74)`,
      );
      radial2.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = radial2;
      context.fillRect(0, 0, width, height);
    };

    const updateTransforms = () => {
      const state = stateRef.current;
      const halfTrack = state.track / 2;
      const stageRect = stage.getBoundingClientRect();
      const halfViewport = stageRect.height * 0.5;
      const maxVisibleLeft = stageRect.width - state.cardWidth - 24;
      const preferredLeft =
        stageRect.width >= 1200
          ? stageRect.width * 0.57
          : stageRect.width >= 900
            ? stageRect.width * 0.52
            : stageRect.width >= 680
              ? stageRect.width * 0.46
              : stageRect.width * 0.42;
      const anchorX = clamp(preferredLeft, 88, maxVisibleLeft);
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      for (let index = 0; index < projects.pushArticles.length; index += 1) {
        let position = index * state.step - state.scrollY;
        if (position < -halfTrack) position += state.track;
        if (position > halfTrack) position -= state.track;

        state.screenPositions[index] = position;
        const distance = Math.abs(position);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      }

      if (closestIndex !== state.activeIndex) {
        state.activeIndex = closestIndex;
        const palette = paletteRef.current[closestIndex] ?? fallbackPalette(closestIndex);
        gradientRef.current.target = {
          r1: palette.c1[0],
          g1: palette.c1[1],
          b1: palette.c1[2],
          r2: palette.c2[0],
          g2: palette.c2[1],
          b2: palette.c2[2],
        };
        startTransition(() => setActiveIndex(closestIndex));
      }

      const previousIndex = mod(closestIndex - 1, projects.pushArticles.length);
      const nextIndex = mod(closestIndex + 1, projects.pushArticles.length);

      for (let index = 0; index < projects.pushArticles.length; index += 1) {
        const node = cardRefs.current[index];
        if (!node) continue;

        const position = state.screenPositions[index];
        const centeredPosition = position - state.cardHeight * 0.5;
        const norm = clamp(position / halfViewport, -1, 1);
        const absNorm = Math.abs(norm);
        const invNorm = 1 - absNorm;
        const rotateX = norm * MAX_ROTATION;
        const depth = invNorm * MAX_DEPTH;
        const scale = MIN_SCALE + invNorm * SCALE_RANGE;
        const blur = index === closestIndex || index === previousIndex || index === nextIndex ? 0 : 2.4 * absNorm;

        node.style.transform = `translate3d(${anchorX}px, ${centeredPosition}px, ${depth}px) rotateX(${rotateX}deg) scale(${scale})`;
        node.style.zIndex = String(1000 + Math.round(depth));
        node.style.filter = `blur(${blur.toFixed(2)}px)`;
      }
    };

    const tick = (time: number) => {
      const state = stateRef.current;
      const deltaSeconds = state.lastTime ? (time - state.lastTime) / 1000 : 0;
      state.lastTime = time;

      if (!state.dragging && state.snapTarget !== null) {
        const delta = shortestDelta(state.scrollY, state.snapTarget, state.track);
        state.velocity += delta * 12 * deltaSeconds;

        if (Math.abs(delta) < 0.5 && Math.abs(state.velocity) < 6) {
          state.scrollY = state.snapTarget;
          state.snapTarget = null;
          state.velocity = 0;
        }
      }

      state.scrollY = mod(state.scrollY + state.velocity * deltaSeconds, state.track);
      state.velocity *= Math.pow(FRICTION, deltaSeconds * 60);
      if (Math.abs(state.velocity) < 0.02) state.velocity = 0;

      drawBackground(time);
      updateTransforms();
      frameRef.current = window.requestAnimationFrame(tick);
    };

    const loadPalettes = async () => {
      const images = cardRefs.current
        .map((node) => node?.querySelector('img'))
        .filter((image): image is HTMLImageElement => Boolean(image));

      await Promise.all(
        images.map(
          (image) =>
            new Promise<void>((resolve) => {
              if (image.complete) {
                resolve();
                return;
              }

              image.addEventListener('load', () => resolve(), { once: true });
              image.addEventListener('error', () => resolve(), { once: true });
            }),
        ),
      );

      paletteRef.current = images.map((image, index) => extractPalette(image, index));
      const initialPalette = paletteRef.current[0] ?? fallbackPalette(0);
      gradientRef.current.current = {
        r1: initialPalette.c1[0],
        g1: initialPalette.c1[1],
        b1: initialPalette.c1[2],
        r2: initialPalette.c2[0],
        g2: initialPalette.c2[1],
        b2: initialPalette.c2[2],
      };
      gradientRef.current.target = { ...gradientRef.current.current };
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      stateRef.current.velocity += delta * WHEEL_SENS;
      stateRef.current.snapTarget = null;
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.push-overlay') || target.closest('.back-button')) return;

      stateRef.current.dragging = true;
      stateRef.current.lastPointerY = event.clientY;
      stateRef.current.lastPointerTime = performance.now();
      stateRef.current.velocity = 0;
      stateRef.current.snapTarget = null;
      pointerIdRef.current = event.pointerId;
      stage.setPointerCapture(event.pointerId);
      stage.classList.add('push-stage--dragging');
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!stateRef.current.dragging) return;

      const now = performance.now();
      const deltaY = event.clientY - stateRef.current.lastPointerY;
      const deltaSeconds = Math.max(1, now - stateRef.current.lastPointerTime) / 1000;

      stateRef.current.scrollY = mod(stateRef.current.scrollY - deltaY * DRAG_SENS, stateRef.current.track);
      stateRef.current.velocity = -(deltaY / deltaSeconds) * DRAG_SENS;
      stateRef.current.lastPointerY = event.clientY;
      stateRef.current.lastPointerTime = now;
    };

    const releasePointer = () => {
      if (!stateRef.current.dragging) return;
      stateRef.current.dragging = false;
      stage.classList.remove('push-stage--dragging');

      if (pointerIdRef.current !== null && stage.hasPointerCapture(pointerIdRef.current)) {
        stage.releasePointerCapture(pointerIdRef.current);
      }

      pointerIdRef.current = null;
    };

    const handleResize = () => {
      resizeCanvas();
      measure();
      updateTransforms();
    };

    void loadPalettes().then(() => {
      resizeCanvas();
      measure();
      updateTransforms();
      frameRef.current = window.requestAnimationFrame(tick);
    });

    stage.addEventListener('wheel', handleWheel, { passive: false });
    stage.addEventListener('pointerdown', handlePointerDown);
    stage.addEventListener('pointermove', handlePointerMove);
    stage.addEventListener('pointerup', releasePointer);
    stage.addEventListener('pointercancel', releasePointer);
    window.addEventListener('resize', handleResize);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      stage.removeEventListener('wheel', handleWheel);
      stage.removeEventListener('pointerdown', handlePointerDown);
      stage.removeEventListener('pointermove', handlePointerMove);
      stage.removeEventListener('pointerup', releasePointer);
      stage.removeEventListener('pointercancel', releasePointer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const activeArticle = projects.pushArticles[activeIndex] as PushArticle;

  const handleCardClick = (index: number) => {
    const state = stateRef.current;
    const position = state.screenPositions[index] ?? 0;

    if (index === activeIndex) {
      window.open(projects.pushArticles[index].url, '_blank', 'noopener,noreferrer');
      return;
    }

    state.snapTarget = mod(state.scrollY + position, state.track);
    state.velocity = 0;
  };

  return (
    <section className="push-carousel-page">
      <canvas aria-hidden="true" className="push-bg-canvas" ref={canvasRef} />
      <div className="push-stage" ref={stageRef}>
        <div aria-hidden="true" className="push-art-direction">
          <span className="push-art-direction__word">EDITORIAL</span>
          <span className="push-art-direction__slash" />
          <span className="push-art-direction__shard push-art-direction__shard--one" />
          <span className="push-art-direction__shard push-art-direction__shard--two" />
          <span className="push-art-direction__shard push-art-direction__shard--three" />
        </div>
        <div className="push-cards" aria-label="推送封面轮播">
          {projects.pushArticles.map((project, index) => (
            <button
              aria-label={project.title}
              className="push-carousel-card"
              key={project.id}
              onClick={() => handleCardClick(index)}
              ref={(node) => {
                cardRefs.current[index] = node;
              }}
              type="button"
            >
              <figure>
                <img alt={project.title} draggable={false} src={project.cover} />
                {project.tag ? <figcaption>{project.tag}</figcaption> : null}
              </figure>
            </button>
          ))}
        </div>

        <div className="push-overlay">
          <div aria-hidden="true" className="push-character-silhouette" />
          <div className="push-copy-wrap">
            <div className="push-copy">
              <p className="eyebrow">推送排版作品</p>
              <h1>{activeArticle.title}</h1>
              <p>{activeArticle.description}</p>
            </div>
            <span aria-hidden="true" className="push-copy-dots">
              {projects.pushArticles.map((project, index) => (
                <i className={index === activeIndex ? 'is-active' : ''} key={project.id} />
              ))}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
