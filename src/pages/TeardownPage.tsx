import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import projects from '../data/projects.json';

type TeardownProject = (typeof projects.teardowns)[number];

const FRICTION = 0.9;
const WHEEL_SENS = 12;
const DRAG_SENS = 1;
const GAP = 28;
const MAX_ROTATION = 28;
const MAX_DEPTH = 140;
const MIN_SCALE = 0.92;
const SCALE_RANGE = 0.1;

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

function shortestDelta(from: number, to: number, track: number) {
  return mod(to - from + track / 2, track) - track / 2;
}

export function TeardownPage() {
  const openTimerRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const stageRef = useRef<HTMLElement | null>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const carouselRef = useRef({
    cardHeight: 280,
    step: 288,
    track: projects.teardowns.length * 288,
    scrollY: 0,
    velocity: 0,
    snapTarget: null as number | null,
  });
  const dragRef = useRef({
    didDrag: false,
    isDragging: false,
    lastPointerTime: 0,
    lastPointerY: 0,
    startY: 0,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [markdown, setMarkdown] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBookOpen, setIsBookOpen] = useState(false);
  const selectedProject = (projects.teardowns[selectedIndex] ?? projects.teardowns[0]) as TeardownProject;
  const bookPalette = {
    c1: selectedProject.backgroundColor,
    c2: selectedProject.backgroundColor,
  };

  const totalProjects = projects.teardowns.length;

  const measureCarousel = () => {
    const sample = cardRefs.current[0];
    const rect = sample?.getBoundingClientRect();
    const cardHeight = rect?.height || Math.min(window.innerHeight * 0.34, 280);
    const step = cardHeight + GAP;

    carouselRef.current.cardHeight = cardHeight;
    carouselRef.current.step = step;
    carouselRef.current.track = step * totalProjects;
  };

  const updateCarousel = () => {
    const stage = stageRef.current;
    if (!stage) return;

    measureCarousel();

    const state = carouselRef.current;
    const rect = stage.getBoundingClientRect();
    const viewportHalf = rect.height * 0.5;
    const trackHalf = state.track * 0.5;
    let closestIndex = selectedIndex;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < totalProjects; index += 1) {
      let screenY = index * state.step - state.scrollY;
      if (screenY < -trackHalf) screenY += state.track;
      if (screenY > trackHalf) screenY -= state.track;

      const distance = Math.abs(screenY);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }

      const card = cardRefs.current[index];
      if (!card) continue;

      const norm = Math.max(-1, Math.min(1, screenY / viewportHalf));
      const absNorm = Math.abs(norm);
      const invNorm = 1 - absNorm;
      const rotateX = norm * MAX_ROTATION;
      const depth = invNorm * MAX_DEPTH;
      const scale = MIN_SCALE + invNorm * SCALE_RANGE;
      const blur = index === closestIndex || Math.abs(index - closestIndex) === 1 ? 0 : 2 * Math.pow(absNorm, 1.1);

      card.style.opacity = absNorm > 1 ? '0' : String(1 - absNorm * 0.18);
      card.style.filter = `blur(${blur.toFixed(2)}px)`;
      card.style.transform = `translate(-50%, -50%) translate3d(0, ${screenY.toFixed(2)}px, ${depth.toFixed(2)}px) rotateX(${rotateX.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      card.style.zIndex = String(1000 + Math.round(depth));
    }

    setSelectedIndex((current) => (current === closestIndex ? current : closestIndex));
  };

  const stopCarousel = () => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    lastTimeRef.current = 0;
  };

  const tickCarousel = (time: number) => {
    const state = carouselRef.current;
    const deltaSeconds = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0;
    lastTimeRef.current = time;

    if (!dragRef.current.isDragging && state.snapTarget !== null) {
      const delta = shortestDelta(state.scrollY, state.snapTarget, state.track);
      state.velocity += delta * 12 * deltaSeconds;

      if (Math.abs(delta) < 0.4 && Math.abs(state.velocity) < 5) {
        state.scrollY = state.snapTarget;
        state.snapTarget = null;
        state.velocity = 0;
      }
    }

    if (!dragRef.current.isDragging) {
      state.scrollY = mod(state.scrollY + state.velocity * deltaSeconds, state.track);
      state.velocity *= Math.pow(FRICTION, deltaSeconds * 60);
      if (Math.abs(state.velocity) < 0.02) {
        state.velocity = 0;
      }
    }

    updateCarousel();

    const shouldContinue = dragRef.current.isDragging || state.snapTarget !== null || Math.abs(state.velocity) > 0;
    if (shouldContinue) {
      frameRef.current = window.requestAnimationFrame(tickCarousel);
    } else {
      stopCarousel();
    }
  };

  const startCarousel = () => {
    if (frameRef.current === null) {
      frameRef.current = window.requestAnimationFrame(tickCarousel);
    }
  };

  useEffect(() => {
    if (!selectedProject) {
      return;
    }

    let isActive = true;
    setIsLoading(true);

    fetch(selectedProject.markdown)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${selectedProject.markdown}`);
        }

        return response.text();
      })
      .then((text) => {
        if (isActive) {
          setMarkdown(text);
        }
      })
      .catch(() => {
        if (isActive) {
          setMarkdown('# 文档加载失败\n\n请确认 Markdown 文件路径是否正确。');
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [selectedProject]);

  useEffect(
    () => () => {
      if (openTimerRef.current !== null) window.clearTimeout(openTimerRef.current);
      stopCarousel();
    },
    [],
  );

  const openProject = (index: number) => {
    if (dragRef.current.didDrag) {
      window.setTimeout(() => {
        dragRef.current.didDrag = false;
      }, 0);
      return;
    }

    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
    }

    setIsBookOpen(false);
    carouselRef.current.snapTarget = index * carouselRef.current.step;
    carouselRef.current.velocity = 0;
    startCarousel();
    openTimerRef.current = window.setTimeout(() => setIsBookOpen(true), 560);
  };

  const closeBook = () => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
    }

    setIsBookOpen(false);
  };

  const handleWheel = (event: React.WheelEvent<HTMLElement>) => {
    if (isBookOpen) return;

    const rawDelta = Math.abs(event.deltaY) >= 0.5 ? event.deltaY : event.deltaX;
    const deltaMultiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerWidth : 1;
    const delta = rawDelta * deltaMultiplier;
    if (Math.abs(delta) < 0.5) return;

    event.preventDefault();
    carouselRef.current.snapTarget = null;
    carouselRef.current.velocity += delta * WHEEL_SENS;
    startCarousel();
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (isBookOpen) return;

    carouselRef.current.snapTarget = null;
    dragRef.current = {
      didDrag: false,
      isDragging: true,
      lastPointerTime: performance.now(),
      lastPointerY: event.clientY,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    startCarousel();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag.isDragging || isBookOpen) return;

    const now = performance.now();
    const deltaY = event.clientY - drag.lastPointerY;
    const deltaMs = Math.max(16, now - drag.lastPointerTime);

    if (Math.abs(event.clientY - drag.startY) > 8) {
      drag.didDrag = true;
    }

    carouselRef.current.scrollY = mod(carouselRef.current.scrollY - deltaY * DRAG_SENS, carouselRef.current.track);
    carouselRef.current.velocity = (-deltaY / deltaMs) * 1000;
    drag.lastPointerY = event.clientY;
    drag.lastPointerTime = now;
    updateCarousel();
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const didDrag = dragRef.current.didDrag;
    dragRef.current.isDragging = false;
    if (didDrag) {
      window.setTimeout(() => {
        dragRef.current.didDrag = false;
      }, 120);
      startCarousel();
    }
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  useEffect(() => {
    updateCarousel();
    const handleResize = () => updateCarousel();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeBook();
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <article
      className="teardown-carousel-page"
      onWheel={handleWheel}
      style={
        {
          '--teardown-c1': bookPalette.c1,
          '--teardown-c2': bookPalette.c2,
          backgroundColor: selectedProject.backgroundColor,
        } as React.CSSProperties
      }
    >
      <div aria-hidden="true" className="teardown-graphic-layer">
        <span className="teardown-white-panel" />
        <span className="teardown-edge-title">ANALYSIS</span>
      </div>

      <div aria-hidden="true" className="teardown-character">
        <img className="teardown-character-shadow" alt="" src="/chatting/character2.png" />
        <img alt="" src="/chatting/character2.png" />
      </div>

      <section
        ref={stageRef}
        className="teardown-cover-stage"
        aria-label="游戏拆解封面轮播"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {projects.teardowns.map((project, index) => {
          const isSelected = index === selectedIndex;

          return (
            <button
              aria-label={`打开${project.title}`}
              className={isSelected ? 'teardown-cover teardown-cover--active' : 'teardown-cover'}
              key={project.id}
              onClick={() => openProject(index)}
              ref={(node) => {
                cardRefs.current[index] = node;
              }}
              type="button"
            >
              <img alt={project.title} src={project.cover} />
            </button>
          );
        })}
      </section>

      <aside className="teardown-carousel-copy">
        <div className="teardown-list-heading">
          <strong>GAME</strong>
          <span>0{selectedIndex + 1} / 0{totalProjects}</span>
        </div>
        <h1>
          {selectedProject.title.split(/\s+/).map((part) => <span key={part}>{part}</span>)}
        </h1>
        <div className="teardown-tag-row">
          {selectedProject.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      </aside>

      {isBookOpen ? (
        <section
          aria-label={`${selectedProject.title} 阅读窗口`}
          className="teardown-book teardown-book--open"
          onClick={closeBook}
          style={
            {
              '--book-page-c1': bookPalette.c1,
              '--book-page-c2': bookPalette.c2,
            } as React.CSSProperties
          }
        >
          <div className="teardown-book-cover" aria-hidden="true">
            <img alt="" src={selectedProject.cover} />
          </div>
          <button
            aria-label="关闭阅读窗口"
            className="teardown-book-close"
            onClick={(event) => {
              event.stopPropagation();
              closeBook();
            }}
            type="button"
          >
            关闭
          </button>
          <div className="teardown-reading-panel" onClick={(event) => event.stopPropagation()}>
            <div className="teardown-reading-content">
              <p className="eyebrow">游戏拆解</p>
              {isLoading ? <p className="markdown-status">正在加载文档...</p> : <ReactMarkdown>{markdown}</ReactMarkdown>}
            </div>
          </div>
        </section>
      ) : null}
    </article>
  );
}
