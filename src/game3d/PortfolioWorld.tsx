import { Canvas } from '@react-three/fiber';
import { KeyboardControls } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { useMemo, useRef, useState } from 'react';
import projects from '../data/projects.json';
import { MobileControlsProvider } from './contexts/MobileControlsContext';
import { MobileControls } from './components/MobileControls';
import { PlayerController, type PlayerHandle, type PortalTarget } from './components/PlayerController';
import { FollowCamera } from './components/FollowCamera';
import { ForestWorld } from './components/ForestWorld';
import { PortalBuilding } from './components/PortalBuilding';
import type { ActiveView, GamePosition, NpcConfig } from '../game/types';

interface PortfolioWorldProps {
  initialPlayerPosition: GamePosition;
  isVisible: boolean;
  onEnterProject: (targetView: Exclude<ActiveView, 'map'>, position: GamePosition) => void;
}

const portalColors = ['#a9d7b0', '#a9c7e8', '#f4b5ca', '#f2cf82'];
const portalPositions: Partial<Record<Exclude<ActiveView, 'map'>, [number, number, number]>> = {
  teardowns: [-2.2, 0, -5.7],
  pushArticles: [-8.4, 0, -6.8],
  socialVideos: [7.2, 0, -5.6],
  gallery: [8.5, 0, 0],
};

const portalInteractionPositions: Partial<Record<Exclude<ActiveView, 'map'>, [number, number, number]>> = {
  teardowns: [-7.2, 0, -7.7],
  pushArticles: [-0.4, 0, -8.3],
  socialVideos: [8, 0, -5],
  gallery: [7.2, 0, -2.4],
};

type ProjectView = Exclude<ActiveView, 'map'>;

interface PortalDialogueConfig {
  question: string;
  confirmLabel: string;
  cancelLabel: string;
  ariaLabel: string;
}

const portalDialogueConfigs: Record<ProjectView, PortalDialogueConfig> = {
  teardowns: {
    question: '要品鉴一下游戏吗？',
    confirmLabel: '浅尝一口',
    cancelLabel: '不够高雅，婉拒了',
    ariaLabel: '游戏理解确认',
  },
  pushArticles: {
    question: '要查看推送排版工作吗？',
    confirmLabel: '看看！',
    cancelLabel: '暂时不了',
    ariaLabel: '推送排版确认',
  },
  socialVideos: {
    question: '要躺床上刷一会儿视频吗？',
    confirmLabel: '就刷一小下',
    cancelLabel: '好困，我要睡了',
    ariaLabel: '视频作品确认',
  },
  gallery: {
    question: '要欣赏一下自己的大作吗？',
    confirmLabel: '赏！',
    cancelLabel: '不是大作，不忍直视',
    ariaLabel: '绘画作品确认',
  },
};

export function PortfolioWorld({ initialPlayerPosition, isVisible, onEnterProject }: PortfolioWorldProps) {
  const playerRef = useRef<PlayerHandle | null>(null);
  const [activePortal, setActivePortal] = useState<PortalTarget | null>(null);
  const [portalPrompt, setPortalPrompt] = useState<{
    targetView: ProjectView;
    position: GamePosition;
    step: 'question' | 'answer';
  } | null>(null);
  const portals = useMemo<PortalTarget[]>(
    () =>
      (projects.npcs as NpcConfig[]).map((npc, index) => ({
        id: npc.id,
        label: npc.label,
        targetType: npc.targetType,
        position: portalPositions[npc.targetType] ?? ([-9 + index * 6, 0, -4.8] as [number, number, number]),
        interactionPosition: portalInteractionPositions[npc.targetType],
      })),
    [],
  );
  const handleEnterProject = (targetView: ProjectView, position: GamePosition) => {
    setPortalPrompt({ targetView, position, step: 'question' });
  };

  const handlePortalLabelInteraction = (portal: PortalTarget) => {
    if (activePortal?.id !== portal.id || portalPrompt) return;

    const position = playerRef.current?.position;
    handleEnterProject(portal.targetType, {
      x: (position?.x ?? 0) * 120 + 1300,
      y: (position?.z ?? 0) * 120 + 460,
    });
  };

  const handleConfirmProject = () => {
    if (!portalPrompt) {
      return;
    }

    onEnterProject(portalPrompt.targetView, portalPrompt.position);
    setPortalPrompt(null);
  };

  return (
    <section className={isVisible ? 'game-shell game-shell--3d' : 'game-shell game-shell--3d game-shell--hidden'}>
      <MobileControlsProvider>
        <div className={portalPrompt ? 'game-3d-hud game-3d-hud--hidden' : 'game-3d-hud'}>
          <span>WASD / 方向键 移动</span>
          <span className="game-3d-hud__desktop-instruction">靠近家具按 E 进入作品页</span>
          <span className="game-3d-hud__mobile-instruction">靠近家具后点击标签进入作品页</span>
        </div>
        <MobileControls />
        <KeyboardControls
          map={[
            { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
            { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
            { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
            { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
            { name: 'sprint', keys: ['ShiftLeft', 'ShiftRight'] },
            { name: 'enter', keys: ['e', 'E'] },
          ]}
        >
          <Canvas shadows dpr={[1, 1.7]}>
            <Physics interpolate={false}>
              <ForestWorld />
              {portals.map((portal, index) => (
                <PortalBuilding
                  isActive={activePortal?.id === portal.id}
                  key={portal.id}
                  onInteract={handlePortalLabelInteraction}
                  portal={portal}
                  tint={portalColors[index % portalColors.length]}
                />
              ))}
              <PlayerController
                ref={playerRef}
                initialPosition={initialPlayerPosition}
                isInteractionPaused={Boolean(portalPrompt) || !isVisible}
                onActivePortalChange={setActivePortal}
                onEnterProject={handleEnterProject}
                portals={portals}
              />
            </Physics>
            <FollowCamera target={playerRef} />
          </Canvas>
        </KeyboardControls>
        {portalPrompt ? (
          <PortalDialogue
            config={portalDialogueConfigs[portalPrompt.targetView]}
            onAdvance={() => setPortalPrompt({ ...portalPrompt, step: 'answer' })}
            onCancel={() => setPortalPrompt(null)}
            onConfirm={handleConfirmProject}
            step={portalPrompt.step}
          />
        ) : null}
      </MobileControlsProvider>
    </section>
  );
}

interface PortalDialogueProps {
  config: PortalDialogueConfig;
  step: 'question' | 'answer';
  onAdvance: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function PortalDialogue({ config, step, onAdvance, onConfirm, onCancel }: PortalDialogueProps) {
  if (step === 'question') {
    return (
      <button className="portfolio-dialogue-advance-layer" onClick={onAdvance} type="button" aria-label="继续">
        <span className="portfolio-dialogue portfolio-dialogue--question" aria-hidden="true">
          <img alt="" src="/chatting/chatingbubble.png" />
          <span className="portfolio-dialogue-question-text">{config.question}</span>
          <span className="portfolio-dialogue-continue">单击继续</span>
        </span>
      </button>
    );
  }

  return (
    <>
      <div className="portfolio-dialogue portfolio-dialogue--question portfolio-dialogue--question-static">
        <img alt="" src="/chatting/chatingbubble.png" />
        <span className="portfolio-dialogue-question-text">{config.question}</span>
        <span className="portfolio-dialogue-continue">单击继续</span>
      </div>
      <div className="portfolio-dialogue-layer" role="dialog" aria-label={config.ariaLabel}>
        <img className="portfolio-dialogue-character" alt="" src="/chatting/character.png" />
        <div className="portfolio-dialogue portfolio-dialogue--answer">
          <img alt="" src="/chatting/chattingbubble2.png" />
          <div className="portfolio-dialogue-options" aria-label="请选择">
            <button onClick={onConfirm} type="button">
              {config.confirmLabel}
            </button>
            <button onClick={onCancel} type="button">
              {config.cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
