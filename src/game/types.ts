export type ActiveView = 'map' | 'teardowns' | 'pushArticles' | 'socialVideos' | 'gallery';

export interface GamePosition {
  x: number;
  y: number;
}

export interface NpcConfig {
  id: string;
  label: string;
  targetType: Exclude<ActiveView, 'map'>;
  x: number;
  outfitColor: string;
}

export interface GameMapProps {
  isVisible: boolean;
  initialPlayerPosition: GamePosition;
  onEnterProject: (targetView: Exclude<ActiveView, 'map'>, position: GamePosition) => void;
}
