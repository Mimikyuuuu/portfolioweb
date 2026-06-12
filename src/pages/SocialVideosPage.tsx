import type React from 'react';
import { useState } from 'react';
import projects from '../data/projects.json';

export function SocialVideosPage() {
  const [activeVideoIds, setActiveVideoIds] = useState<Set<string>>(() => new Set());

  const activateVideo = (id: string) => {
    setActiveVideoIds((current) => {
      const next = new Set(current);
      next.add(id);
      return next;
    });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    event.currentTarget.style.setProperty('--reveal-x', `${x.toFixed(2)}%`);
    event.currentTarget.style.setProperty('--reveal-y', `${y.toFixed(2)}%`);
  };

  return (
    <section className="video-gallery-page">
      <header className="video-gallery-copy">
        <span>VIDEOS</span>
      </header>

      <div className="video-stack" aria-label="视频作品列表">
        {projects.socialVideos.map((project, index) => (
          <article className="video-row" key={project.id}>
            <div
              aria-label={`显示${project.title}彩色封面`}
              className={activeVideoIds.has(project.id) ? 'video-work-card video-work-card--active' : 'video-work-card'}
              onClick={() => activateVideo(project.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  activateVideo(project.id);
                }
              }}
              onPointerMove={handlePointerMove}
              role="button"
              tabIndex={0}
            >
              <img alt={project.title} className="video-work-image video-work-image--mono" src={project.cover} />
              <span aria-hidden="true" className="video-work-color">
                <img className="video-work-image" src={project.cover} alt="" />
              </span>
              <span className="video-work-index">0{index + 1}</span>
              <span className="video-work-title">{project.title}</span>
              <a
                className="video-work-play"
                href={project.url}
                onClick={(event) => {
                  event.stopPropagation();
                  if (project.url === '#') event.preventDefault();
                }}
                rel="noreferrer"
                target="_blank"
              >
                PLAY
              </a>
            </div>

            <aside className="video-stat-panel" aria-label={`${project.title} 播放数据`}>
              <div className="video-stat-heading">
                <span>DATA</span>
                <strong>0{index + 1}</strong>
              </div>
              {project.platformStats.map((stat) => (
                <div className="video-stat-line" key={stat.platform}>
                  <strong>{stat.platform}</strong>
                  <dl>
                    <div><dt>播放</dt><dd>{stat.views}</dd></div>
                    <div><dt>点赞</dt><dd>{stat.likes}</dd></div>
                    <div><dt>收藏</dt><dd>{stat.collects}</dd></div>
                  </dl>
                </div>
              ))}
            </aside>
          </article>
        ))}
      </div>

      <p className="video-gallery-hint">SELECT A VIDEO TO PLAY</p>
    </section>
  );
}
