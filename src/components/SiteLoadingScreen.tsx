import { useProgress } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';

const MIN_VISIBLE_MS = 1800;
const FALLBACK_MS = 9000;

export function SiteLoadingScreen() {
  const { active, progress, total } = useProgress();
  const startedAtRef = useRef(performance.now());
  const sawResourcesRef = useRef(false);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (active || total > 0) sawResourcesRef.current = true;
  }, [active, total]);

  useEffect(() => {
    if (!isVisible) return;

    let frameId = 0;

    const update = () => {
      const elapsed = performance.now() - startedAtRef.current;
      const resourcesReady = sawResourcesRef.current && !active && progress >= 100;
      const fallbackReady = elapsed >= FALLBACK_MS;
      const canFinish = elapsed >= MIN_VISIBLE_MS && (resourcesReady || fallbackReady);
      const simulatedProgress = Math.min(88, (elapsed / MIN_VISIBLE_MS) * 72);
      const target = canFinish ? 100 : Math.max(simulatedProgress, Math.min(progress, 94));

      setDisplayProgress((current) => {
        const next = current + (target - current) * (canFinish ? 0.18 : 0.08);
        return target - next < 0.12 ? target : next;
      });

      if (canFinish) {
        setIsComplete(true);
      }

      frameId = window.requestAnimationFrame(update);
    };

    frameId = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frameId);
  }, [active, isVisible, progress]);

  useEffect(() => {
    if (!isComplete || displayProgress < 99.9) return;

    const timer = window.setTimeout(() => setIsVisible(false), 620);
    return () => window.clearTimeout(timer);
  }, [displayProgress, isComplete]);

  if (!isVisible) return null;

  const roundedProgress = Math.min(100, Math.round(displayProgress));

  return (
    <div className={isComplete ? 'site-loader site-loader--complete' : 'site-loader'} role="status" aria-live="polite">
      <div className="site-loader__art" aria-hidden="true">
        <span className="site-loader__orbit site-loader__orbit--one" />
        <span className="site-loader__orbit site-loader__orbit--two" />
        <span className="site-loader__spark site-loader__spark--one" />
        <span className="site-loader__spark site-loader__spark--two" />
      </div>

      <div className="site-loader__content">
        <p className="site-loader__eyebrow">PORTFOLIO WORLD</p>
        <h1>正在进入房间</h1>
        <div className="site-loader__track">
          <span className="site-loader__fill" style={{ width: `${displayProgress}%` }} />
          <span className="site-loader__pen" style={{ left: `${displayProgress}%` }}>✦</span>
        </div>
        <div className="site-loader__meta">
          <span>{isComplete ? '绘制完成' : '请稍候，毛坯房正在装修'}</span>
          <strong>{String(roundedProgress).padStart(2, '0')}%</strong>
        </div>
      </div>
    </div>
  );
}
