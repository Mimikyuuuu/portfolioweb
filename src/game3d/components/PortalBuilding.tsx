import { Html, useFBX } from '@react-three/drei';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useMemo } from 'react';
import { Box3, DoubleSide, MeshStandardMaterial, Vector3, type Material, type Object3D } from 'three';
import type { PortalTarget } from './PlayerController';

interface PortalBuildingProps {
  portal: PortalTarget;
  isActive: boolean;
  tint: string;
}

const DESK_MODEL_WIDTH = 4.2;
const DESK_MODEL_POSITION: [number, number, number] = [5, 0, -4];
const DESK_MODEL_ROTATION_Y = Math.PI * 2;
const DESK_COLLIDER_POSITION: [number, number, number] = [8.5, 1.5, -1.5];
const DESK_COLLIDER_HALF_SIZE: [number, number, number] = [2.2, 1.5, 2];
const DESK_LABEL_POSITION: [number, number, number] = [8, 2.9, -1];
const SHOW_DESK_COLLIDER = false;
const DESK_COLOR = '#e07e7e';

export function PortalBuilding({ portal, isActive, tint }: PortalBuildingProps) {
  if (portal.targetType === 'teardowns') {
    return <GamingSetupPortal isActive={isActive} portal={portal} />;
  }

  if (portal.targetType === 'pushArticles') {
    return <DeskPortal isActive={isActive} portal={portal} />;
  }

  if (portal.targetType === 'socialVideos') {
    return <BedPortal isActive={isActive} portal={portal} />;
  }

  if (portal.targetType === 'gallery') {
    return <PaintingStandPortal isActive={isActive} portal={portal} />;
  }

  return null;
}

interface FurniturePortalProps {
  portal: PortalTarget;
  isActive: boolean;
}

const BED_MODEL_WIDTH = 5.2;
const BED_MODEL_POSITION: [number, number, number] = [0, 0, -2];
const BED_MODEL_ROTATION_Y = -Math.PI * 0.5;
const BED_COLLIDER_POSITION: [number, number, number] = [0, 1.05, -2];
const BED_COLLIDER_HALF_SIZE: [number, number, number] = [3, 1.05, 2];
const BED_LABEL_POSITION: [number, number, number] = [0, 2.6, -2];
const SHOW_BED_COLLIDER = false;
const BED_COLOR = '#eb93aa';

const GAMING_MODEL_WIDTH = 4.8;
const GAMING_MODEL_POSITION: [number, number, number] = [-3.5, 0, -3];
const GAMING_MODEL_ROTATION_Y = Math.PI * 0.5;
const GAMING_COLLIDER_POSITION: [number, number, number] = [-5, 1.2, -2];
const GAMING_COLLIDER_HALF_SIZE: [number, number, number] = [2.5, 1.2, 2.5];
const GAMING_LABEL_POSITION: [number, number, number] = [-5.5, 2.85, -1];
const SHOW_GAMING_COLLIDER = false;
const GAMING_COLOR = '#fd7095';

const PAINTING_STAND_MODEL_WIDTH = 2.8;
const PAINTING_STAND_MODEL_POSITION: [number, number, number] = [0, 0, 0];
const PAINTING_STAND_MODEL_ROTATION_Y = Math.PI * 1.5;
const PAINTING_STAND_COLLIDER_POSITION: [number, number, number] = [0, 1.15, 0];
const PAINTING_STAND_COLLIDER_HALF_SIZE: [number, number, number] = [1.05, 1.15, 0.55];
const PAINTING_STAND_LABEL_POSITION: [number, number, number] = [0, 2.7, 0];
const SHOW_PAINTING_STAND_COLLIDER = false;
const PAINTING_STAND_COLOR = '#ffc1e4';

function DeskPortal({ portal, isActive }: FurniturePortalProps) {
  const desk = useFBX('/models/desk-set/source/Desk.fbx');
  const model = useMemo(() => {
    const clone = desk.clone(true);
    const box = new Box3().setFromObject(clone);
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const scale = DESK_MODEL_WIDTH / Math.max(size.x, size.z, 1);

    clone.position.sub(center);
    clone.scale.setScalar(scale);
    clone.rotation.y = DESK_MODEL_ROTATION_Y;

    clone.traverse((child: Object3D & { material?: Material | Material[] }) => {
      child.castShadow = true;
      child.receiveShadow = true;

      if (!child.material) {
        return;
      }

      child.material = new MeshStandardMaterial({
        color: DESK_COLOR,
        metalness: 0.04,
        roughness: 0.78,
        side: DoubleSide,
      });
    });

    return clone;
  }, [desk]);

  return (
    <group position={portal.position}>
      <group position={DESK_COLLIDER_POSITION}>
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={DESK_COLLIDER_HALF_SIZE} position={[0, 0, 0]} />
        </RigidBody>

        {SHOW_DESK_COLLIDER ? (
          <mesh>
            <boxGeometry
              args={[
                DESK_COLLIDER_HALF_SIZE[0] * 2,
                DESK_COLLIDER_HALF_SIZE[1] * 2,
                DESK_COLLIDER_HALF_SIZE[2] * 2,
              ]}
            />
            <meshStandardMaterial color="#5bc8ff" transparent opacity={0.32} roughness={0.55} />
          </mesh>
        ) : null}
      </group>

      <primitive object={model} position={DESK_MODEL_POSITION} />

      <Html center distanceFactor={9} position={DESK_LABEL_POSITION} wrapperClass="portal-label-anchor" zIndexRange={[4, 0]}>
        <div className={isActive ? 'portal-label portal-label--active' : 'portal-label'}>
          <span>推送排版</span>
          {isActive ? <strong>[E] 进入</strong> : null}
        </div>
      </Html>
    </group>
  );
}

function GamingSetupPortal({ portal, isActive }: FurniturePortalProps) {
  const gamingSetup = useFBX('/models/gaming-setup/source/setap1.fbx');
  const model = useMemo(() => {
    const clone = gamingSetup.clone(true);
    const box = new Box3().setFromObject(clone);
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const scale = GAMING_MODEL_WIDTH / Math.max(size.x, size.z, 1);

    clone.position.sub(center);
    clone.scale.setScalar(scale);
    clone.rotation.y = GAMING_MODEL_ROTATION_Y;

    clone.traverse((child: Object3D & { material?: Material | Material[] }) => {
      child.castShadow = true;
      child.receiveShadow = true;

      if (!child.material) {
        return;
      }

      child.material = new MeshStandardMaterial({
        color: GAMING_COLOR,
        metalness: 0.08,
        roughness: 0.74,
        side: DoubleSide,
      });
    });

    return clone;
  }, [gamingSetup]);

  return (
    <group position={portal.position}>
      <group position={GAMING_COLLIDER_POSITION}>
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={GAMING_COLLIDER_HALF_SIZE} position={[0, 0, 0]} />
        </RigidBody>

        {SHOW_GAMING_COLLIDER ? (
          <mesh>
            <boxGeometry
              args={[
                GAMING_COLLIDER_HALF_SIZE[0] * 2,
                GAMING_COLLIDER_HALF_SIZE[1] * 2,
                GAMING_COLLIDER_HALF_SIZE[2] * 2,
              ]}
            />
            <meshStandardMaterial color="#5bc8ff" transparent opacity={0.32} roughness={0.55} />
          </mesh>
        ) : null}
      </group>

      <primitive object={model} position={GAMING_MODEL_POSITION} />

      <Html center distanceFactor={9} position={GAMING_LABEL_POSITION} wrapperClass="portal-label-anchor" zIndexRange={[4, 0]}>
        <div className={isActive ? 'portal-label portal-label--active' : 'portal-label'}>
          <span>游戏理解</span>
          {isActive ? <strong>[E] 进入</strong> : null}
        </div>
      </Html>
    </group>
  );
}

function BedPortal({ portal, isActive }: FurniturePortalProps) {
  const bed = useFBX('/models/provence-style-bed/source/Provence Style Bed.fbx');
  const model = useMemo(() => {
    const clone = bed.clone(true);
    const box = new Box3().setFromObject(clone);
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const scale = BED_MODEL_WIDTH / Math.max(size.x, size.z, 1);

    clone.position.sub(center);
    clone.scale.setScalar(scale);
    clone.rotation.y = BED_MODEL_ROTATION_Y;

    clone.traverse((child: Object3D & { material?: Material | Material[] }) => {
      child.castShadow = true;
      child.receiveShadow = true;

      if (!child.material) {
        return;
      }

      child.material = new MeshStandardMaterial({
        color: BED_COLOR,
        metalness: 0.03,
        roughness: 0.82,
        side: DoubleSide,
      });
    });

    return clone;
  }, [bed]);

  return (
    <group position={portal.position}>
      <group position={BED_COLLIDER_POSITION}>
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={BED_COLLIDER_HALF_SIZE} position={[0, 0, 0]} />
        </RigidBody>

        {SHOW_BED_COLLIDER ? (
          <mesh>
            <boxGeometry
              args={[
                BED_COLLIDER_HALF_SIZE[0] * 2,
                BED_COLLIDER_HALF_SIZE[1] * 2,
                BED_COLLIDER_HALF_SIZE[2] * 2,
              ]}
            />
            <meshStandardMaterial color="#5bc8ff" transparent opacity={0.32} roughness={0.55} />
          </mesh>
        ) : null}
      </group>

      <primitive object={model} position={BED_MODEL_POSITION} />

      <Html center distanceFactor={9} position={BED_LABEL_POSITION} wrapperClass="portal-label-anchor" zIndexRange={[4, 0]}>
        <div className={isActive ? 'portal-label portal-label--active' : 'portal-label'}>
          <span>视频作品</span>
          {isActive ? <strong>[E] 进入</strong> : null}
        </div>
      </Html>
    </group>
  );
}

function PaintingStandPortal({ portal, isActive }: FurniturePortalProps) {
  const paintingStand = useFBX('/models/painting-stand-with-painting/source/PaintingStand/PaintingStand.fbx');
  const model = useMemo(() => {
    const clone = paintingStand.clone(true);
    const box = new Box3().setFromObject(clone);
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const scale = PAINTING_STAND_MODEL_WIDTH / Math.max(size.x, size.z, 1);

    clone.position.sub(center);
    clone.scale.setScalar(scale);
    clone.rotation.y = PAINTING_STAND_MODEL_ROTATION_Y;

    clone.traverse((child: Object3D & { material?: Material | Material[] }) => {
      child.castShadow = true;
      child.receiveShadow = true;

        if (!child.material) {
        return;
      }

      child.material = new MeshStandardMaterial({
        color: PAINTING_STAND_COLOR,
        metalness: 0.08,
        roughness: 0.74,
        side: DoubleSide,
      });
    });

    return clone;
  }, [paintingStand]);

  return (
    <group position={portal.position}>
      <group position={PAINTING_STAND_COLLIDER_POSITION}>
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={PAINTING_STAND_COLLIDER_HALF_SIZE} position={[0, 0, 0]} />
        </RigidBody>

        {SHOW_PAINTING_STAND_COLLIDER ? (
          <mesh>
            <boxGeometry
              args={[
                PAINTING_STAND_COLLIDER_HALF_SIZE[0] * 2,
                PAINTING_STAND_COLLIDER_HALF_SIZE[1] * 2,
                PAINTING_STAND_COLLIDER_HALF_SIZE[2] * 2,
              ]}
            />
            <meshStandardMaterial color="#5bc8ff" transparent opacity={0.32} roughness={0.55} />
          </mesh>
        ) : null}
      </group>

      <primitive object={model} position={PAINTING_STAND_MODEL_POSITION} />

      <Html
        center
        distanceFactor={9}
        position={PAINTING_STAND_LABEL_POSITION}
        wrapperClass="portal-label-anchor"
        zIndexRange={[4, 0]}
      >
        <div className={isActive ? 'portal-label portal-label--active' : 'portal-label'}>
          <span>绘画制图</span>
          {isActive ? <strong>[E] 进入</strong> : null}
        </div>
      </Html>
    </group>
  );
}
