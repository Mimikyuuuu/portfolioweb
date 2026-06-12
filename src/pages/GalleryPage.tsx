import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import projects from '../data/projects.json';

type GalleryProject = (typeof projects.gallery)[number];

const ROWS = 5;
const COLS = 7;
const REPEAT_COUNT = 3;
const ROW_GAP = 168;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function GalleryPage() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const tubeRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const frameRef = useRef<number | null>(null);
  const scrollTargetRef = useRef(0);
  const scrollCurrentRef = useRef(0);
  const spinVelocityRef = useRef(0);
  const angleRef = useRef(0);
  const lastTimeRef = useRef(0);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredProject, setHoveredProject] = useState<GalleryProject | null>(null);
  const [previewProject, setPreviewProject] = useState<GalleryProject | null>(null);

  const gallery = projects.gallery as GalleryProject[];
  const randomOrder = useMemo(() => {
    const order = gallery.map((_, index) => index);
    let seed = 20240528;

    for (let index = order.length - 1; index > 0; index -= 1) {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      const swapIndex = seed % (index + 1);
      [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
    }

    return order;
  }, [gallery]);

  const slots = useMemo(() => {
    const totalRows = ROWS * REPEAT_COUNT;

    return Array.from({ length: totalRows * COLS }, (_, slotIndex) => {
      const rowIndex = Math.floor(slotIndex / COLS);
      const colIndex = slotIndex % COLS;
      const baseRow = rowIndex % ROWS;
      const projectIndex = randomOrder[slotIndex % randomOrder.length] ?? 0;

      return {
        slotIndex,
        rowIndex,
        colIndex,
        baseRow,
        project: gallery[projectIndex],
        projectIndex,
      };
    });
  }, [gallery, randomOrder]);

  const updateTransforms = useCallback(() => {
    const stage = stageRef.current;
    const tube = tubeRef.current;
    if (!stage || !tube) return;

    const rect = stage.getBoundingClientRect();
    const radius = clamp(rect.width * 0.34, 250, 520);
    const totalRows = ROWS * REPEAT_COUNT;
    const loopHeight = totalRows * ROW_GAP;
    const scrollCurrent = scrollCurrentRef.current;
    let nearestIndex = activeIndexRef.current;
    let nearestScore = Number.POSITIVE_INFINITY;

    tube.style.transform = 'rotateX(-3deg)';

    for (const slot of slots) {
      const card = cardRefs.current[slot.slotIndex];
      if (!card) continue;

      let y = (slot.rowIndex - (totalRows - 1) / 2) * ROW_GAP - scrollCurrent;
      while (y < -loopHeight / 2) y += loopHeight;
      while (y > loopHeight / 2) y -= loopHeight;

      const rowOffset = slot.baseRow % 2 === 0 ? 0 : 0.5;
      const rowSpeed = 0.7 + (slot.baseRow / Math.max(1, ROWS - 1)) * 0.8;
      const theta = ((slot.colIndex + rowOffset) / COLS) * Math.PI * 2 + angleRef.current * rowSpeed;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      const rotateY = -theta + Math.PI / 2;
      const frontness = (Math.sin(theta) + 1) / 2;
      const depthOpacity = 0.18 + frontness * 0.82;
      const yFade = 1 - clamp(Math.abs(y) / (rect.height * 0.72), 0, 0.8);
      const scale = 0.74 + frontness * 0.42;
      const score = Math.abs(y) * 0.8 + (1 - frontness) * 260;

      if (score < nearestScore) {
        nearestScore = score;
        nearestIndex = slot.projectIndex;
      }

      card.style.opacity = String(depthOpacity * yFade);
      card.style.zIndex = String(Math.round(frontness * 1000));
      card.style.transform = [
        'translate(-50%, -50%)',
        `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px)`,
        `rotateY(${rotateY.toFixed(4)}rad)`,
        `scale(${scale.toFixed(3)})`,
      ].join(' ');
    }

    setActiveIndex((current) => {
      if (current === nearestIndex) return current;
      activeIndexRef.current = nearestIndex;
      return nearestIndex;
    });
  }, [slots]);

  const tick = useCallback(
    (time: number) => {
      const deltaSeconds = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0;
      lastTimeRef.current = time;

      const scrollDelta = scrollTargetRef.current - scrollCurrentRef.current;
      scrollCurrentRef.current += scrollDelta * 0.12;

      if (Math.abs(scrollDelta) < 0.02) {
        scrollCurrentRef.current = scrollTargetRef.current;
      }

      spinVelocityRef.current *= Math.pow(0.91, deltaSeconds * 60);
      if (Math.abs(spinVelocityRef.current) < 0.0005) {
        spinVelocityRef.current = 0;
      }
      angleRef.current += spinVelocityRef.current * deltaSeconds;

      updateTransforms();

      const shouldContinue =
        Math.abs(scrollTargetRef.current - scrollCurrentRef.current) > 0.02 ||
        Math.abs(spinVelocityRef.current) > 0;

      if (shouldContinue) {
        frameRef.current = window.requestAnimationFrame(tick);
      } else {
        frameRef.current = null;
        lastTimeRef.current = 0;
      }
    },
    [updateTransforms],
  );

  const startAnimation = useCallback(() => {
    if (frameRef.current === null) {
      frameRef.current = window.requestAnimationFrame(tick);
    }
  }, [tick]);

  useEffect(() => {
    updateTransforms();

    const handleResize = () => updateTransforms();
    window.addEventListener('resize', handleResize);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [updateTransforms]);

  const handleWheel = (event: React.WheelEvent<HTMLElement>) => {
    scrollTargetRef.current += event.deltaY * 0.42;
    spinVelocityRef.current += event.deltaY * 0.0007;
    startAnimation();
  };

  useEffect(() => {
    if (!previewProject) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewProject(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewProject]);

  const activeProject = hoveredProject ?? gallery[activeIndex] ?? gallery[0];

  return (
    <section className="gallery-tube-page" onWheel={handleWheel}>
      <div className="gallery-tube-stage" ref={stageRef}>
        <div aria-hidden="true" className="gallery-tube-centerpiece">
          <img className="gallery-tube-centerpiece-shadow" alt="" src="/chatting/dropping.png" />
          <img alt="" src="/chatting/dropping.png" />
        </div>
        <div className="gallery-tube" ref={tubeRef}>
          {slots.map((slot) => (
            <button
              aria-label={`查看作品：${slot.project.title}`}
              className="gallery-tube-card"
              key={slot.slotIndex}
              onClick={() => setPreviewProject(slot.project)}
              onPointerEnter={() => setHoveredProject(slot.project)}
              onPointerLeave={() => setHoveredProject(null)}
              ref={(node) => {
                cardRefs.current[slot.slotIndex] = node;
              }}
              type="button"
            >
              <img alt={slot.project.title} draggable={false} src={slot.project.image} />
            </button>
          ))}
        </div>
      </div>

      <aside className="gallery-tube-info">
        <p className="eyebrow">绘画与制图作品</p>
        <h1>{activeProject.title}</h1>
        <p>{activeProject.description}</p>
      </aside>

      <p className="gallery-tube-hint">上下滚动浏览 · 点击查看大图</p>

      {previewProject ? (
        <div
          aria-modal="true"
          className="gallery-preview-modal"
          onClick={() => setPreviewProject(null)}
          role="dialog"
        >
          <button
            aria-label="关闭大图预览"
            className="gallery-preview-close"
            onClick={() => setPreviewProject(null)}
            type="button"
          >
            关闭
          </button>
          <figure className="gallery-preview-frame" onClick={(event) => event.stopPropagation()}>
            <img alt={previewProject.title} src={previewProject.image} />
            <figcaption>{previewProject.title}</figcaption>
          </figure>
        </div>
      ) : null}
    </section>
  );
}
