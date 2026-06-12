import { PortfolioWorld } from '../game3d/PortfolioWorld';
import type { GameMapProps } from './types';

export function GameMap({ isVisible, initialPlayerPosition, onEnterProject }: GameMapProps) {
  return (
    <PortfolioWorld
      initialPlayerPosition={initialPlayerPosition}
      isVisible={isVisible}
      onEnterProject={onEnterProject}
    />
  );
}
