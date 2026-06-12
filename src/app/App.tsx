import { useState } from 'react';
import { BackToMapButton } from '../components/BackToMapButton';
import { SiteLoadingScreen } from '../components/SiteLoadingScreen';
import { GameMap } from '../game/GameMap';
import { GalleryPage } from '../pages/GalleryPage';
import { PushArticlesPage } from '../pages/PushArticlesPage';
import { SocialVideosPage } from '../pages/SocialVideosPage';
import { TeardownPage } from '../pages/TeardownPage';
import type { ActiveView, GamePosition } from '../game/types';

const initialPosition: GamePosition = { x: 160, y: 460 };

export function App() {
  const [activeView, setActiveView] = useState<ActiveView>('map');
  const [lastPlayerPosition, setLastPlayerPosition] = useState(initialPosition);

  const enterProject = (targetView: Exclude<ActiveView, 'map'>, position: GamePosition) => {
    setLastPlayerPosition(position);
    setActiveView(targetView);
  };

  const returnToMap = () => {
    setActiveView('map');
  };

  return (
    <main className="app-shell">
      <SiteLoadingScreen />
      <GameMap
        isVisible={activeView === 'map'}
        initialPlayerPosition={lastPlayerPosition}
        onEnterProject={enterProject}
      />

      {activeView !== 'map' ? (
        <section
          className={
            activeView === 'teardowns' || activeView === 'socialVideos'
              ? 'page-layer page-layer--immersive'
              : 'page-layer'
          }
        >
          <BackToMapButton onBack={returnToMap} />
          {activeView === 'teardowns' ? <TeardownPage /> : null}
          {activeView === 'pushArticles' ? <PushArticlesPage /> : null}
          {activeView === 'socialVideos' ? <SocialVideosPage /> : null}
          {activeView === 'gallery' ? <GalleryPage /> : null}
        </section>
      ) : null}
    </main>
  );
}
