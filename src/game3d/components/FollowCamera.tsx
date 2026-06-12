import { PerspectiveCamera } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Vector3 } from 'three';
import type { PlayerHandle } from './PlayerController';

interface FollowCameraProps {
  target: { current: PlayerHandle | null };
}

export function FollowCamera({ target }: FollowCameraProps) {
  const currentPosition = useRef(new Vector3(0, 4.8, 8));

  useFrame((state) => {
    if (!target.current) {
      return;
    }

    const position = target.current.position;
    const targetPosition = position.clone().add(new Vector3(0, 4.2, 7.4));
    currentPosition.current.lerp(targetPosition, 0.08);
    state.camera.position.copy(currentPosition.current);
    state.camera.lookAt(position.clone().add(new Vector3(0, 1.2, 0)));
  });

  return <PerspectiveCamera makeDefault position={[0, 4.8, 8]} fov={58} />;
}
