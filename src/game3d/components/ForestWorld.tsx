import { Environment, Sparkles, useTexture } from '@react-three/drei';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { DoubleSide, RepeatWrapping } from 'three';

const GROUND_WIDTH = 20;
const GROUND_DEPTH = 20;
const WALL_HEIGHT = 32;
const WALL_THICKNESS = 0.8;

export function ForestWorld() {
  const texture = useTexture('/game3d/final-texture.png');
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(10, 10);

  return (
    <>
      <color attach="background" args={['#f8c6d2']} />
      <fog attach="fog" args={['#f8c6d2', 12, 34]} />
      <Environment preset="sunset" background={false} blur={0.65} />
      <ambientLight intensity={0.86} />
      <directionalLight
        castShadow
        position={[7, 12, 6]}
        intensity={1.75}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
      />

      <RigidBody type="fixed" colliders="cuboid">
        <mesh receiveShadow position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[GROUND_WIDTH, GROUND_DEPTH]} />
          <meshStandardMaterial color="#f58aa2" map={texture} roughness={0.82} metalness={0.05} />
        </mesh>
        <mesh position={[0, -0.1, 0]} visible={false}>
          <boxGeometry args={[GROUND_WIDTH, 0.12, GROUND_DEPTH]} />
          <meshBasicMaterial />
        </mesh>
      </RigidBody>

      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[WALL_THICKNESS / 2, WALL_HEIGHT / 2, GROUND_DEPTH / 2]} position={[-GROUND_WIDTH / 2, WALL_HEIGHT / 2, 0]} />
        <CuboidCollider args={[WALL_THICKNESS / 2, WALL_HEIGHT / 2, GROUND_DEPTH / 2]} position={[GROUND_WIDTH / 2, WALL_HEIGHT / 2, 0]} />
        <CuboidCollider args={[GROUND_WIDTH / 2, WALL_HEIGHT / 2, WALL_THICKNESS / 2]} position={[0, WALL_HEIGHT / 2, -GROUND_DEPTH / 2]} />
        <CuboidCollider args={[GROUND_WIDTH / 2, WALL_HEIGHT / 2, WALL_THICKNESS / 2]} position={[0, WALL_HEIGHT / 2, GROUND_DEPTH / 2]} />
      </RigidBody>

      <group>
        {[
          { position: [-GROUND_WIDTH / 2, 4.5, 0] as const, size: [0.18, 9, GROUND_DEPTH] as const },
          { position: [GROUND_WIDTH / 2, 4.5, 0] as const, size: [0.18, 9, GROUND_DEPTH] as const },
          { position: [0, 4.5, -GROUND_DEPTH / 2] as const, size: [GROUND_WIDTH, 9, 0.18] as const },
          { position: [0, 4.5, GROUND_DEPTH / 2] as const, size: [GROUND_WIDTH, 9, 0.18] as const },
        ].map((wall, index) => (
          <mesh key={index} position={wall.position} receiveShadow>
            <boxGeometry args={wall.size} />
            <meshStandardMaterial color="#f8b5c4" transparent opacity={0.42} roughness={0.8} />
          </mesh>
        ))}
      </group>

     

      <mesh position={[0, 1.2, -11.35]} rotation={[0, 0, 0]}>
        <planeGeometry args={[34, 6]} />
        <meshBasicMaterial color="#f7c9c5" transparent opacity={0.28} side={DoubleSide} />
      </mesh>

      <Sparkles count={90} scale={[24, 3, 18]} position={[0, 1.2, 0]} size={1.8} speed={0.18} color="#fff0c5" />
    </>
  );
}
