import { useKeyboardControls } from '@react-three/drei';
import { CapsuleCollider, RigidBody, type RapierRigidBody, useRapier } from '@react-three/rapier';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Group, MathUtils, Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';
import { useMobileControls } from '../contexts/MobileControlsContext';
import { calculateMovement, createMovementVelocity } from '../utils/physics';
import { CharacterModel } from './CharacterModel';
import type { ActiveView, GamePosition } from '../../game/types';

export interface PortalTarget {
  id: string;
  label: string;
  targetType: Exclude<ActiveView, 'map'>;
  position: [number, number, number];
  interactionPosition?: [number, number, number];
}

interface PlayerControllerProps {
  initialPosition: GamePosition;
  isInteractionPaused?: boolean;
  portals: PortalTarget[];
  onActivePortalChange: (portal: PortalTarget | null) => void;
  onEnterProject: (targetView: Exclude<ActiveView, 'map'>, position: GamePosition) => void;
}

export interface PlayerHandle {
  position: Vector3;
}

const MOVE_SPEED = 15;
const SPRINT_MULTIPLIER = 1.2;
const AIR_CONTROL = 0.6;
const INTERACTION_DISTANCE = 5;

export const PlayerController = forwardRef<PlayerHandle, PlayerControllerProps>(
  ({ initialPosition, isInteractionPaused = false, portals, onActivePortalChange, onEnterProject }, ref) => {
    const rigidBody = useRef<RapierRigidBody>(null);
    const modelRef = useRef<Group>(null);
    const [, getKeys] = useKeyboardControls();
    const { movement: mobileMovement } = useMobileControls();
    const { rapier, world } = useRapier();
    const [isGrounded, setIsGrounded] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [isSprinting, setIsSprinting] = useState(false);
    const targetRotation = useRef(0);
    const currentRotation = useRef(0);
    const activePortalRef = useRef<PortalTarget | null>(null);
    const interactionLockedUntil = useRef(0);
    const initialX = (initialPosition.x - 1300) / 120;
    const initialZ = (initialPosition.y - 460) / 120;

    useImperativeHandle(ref, () => ({
      get position() {
        const translation = rigidBody.current?.translation();
        return new Vector3(translation?.x ?? 0, translation?.y ?? 0, translation?.z ?? 0);
      },
    }));

    useFrame((state) => {
      if (!rigidBody.current) {
        return;
      }

      const translation = rigidBody.current.translation();
      const linvel = rigidBody.current.linvel();
      const rayOffsets = [
        { x: 0, z: 0 },
        { x: 0.28, z: 0 },
        { x: -0.28, z: 0 },
        { x: 0, z: 0.28 },
        { x: 0, z: -0.28 },
      ];
      const grounded = rayOffsets.some((offset) => {
        const ray = new rapier.Ray(
          { x: translation.x + offset.x, y: translation.y, z: translation.z + offset.z },
          { x: 0, y: -1, z: 0 },
        );
        const hit = world.castRay(ray, 1.55, true, undefined, undefined, undefined, rigidBody.current ?? undefined);
        return Boolean(hit);
      });
      const keys = getKeys();
      const horizontalSpeed = Math.sqrt(linvel.x * linvel.x + linvel.z * linvel.z);
      const moving = horizontalSpeed > 0.2;
      const sprinting = keys.sprint && moving;

      setIsGrounded(grounded);
      setIsMoving(moving);
      setIsSprinting(sprinting);

      if (Math.abs(linvel.x) > 0.08 || Math.abs(linvel.z) > 0.08) {
        targetRotation.current = Math.atan2(linvel.x, linvel.z);
        let angleDiff = targetRotation.current - currentRotation.current;

        if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        targetRotation.current = currentRotation.current + angleDiff;
      }

      if (modelRef.current) {
        currentRotation.current = MathUtils.lerp(currentRotation.current, targetRotation.current, 0.18);
        modelRef.current.rotation.y = currentRotation.current;
      }

      let movement = calculateMovement(keys, MOVE_SPEED);

      if (Math.abs(mobileMovement.x) > 0 || Math.abs(mobileMovement.y) > 0) {
        movement = {
          normalizedX: mobileMovement.x,
          normalizedZ: mobileMovement.y,
          sprint: false,
        };
      }

      if (isInteractionPaused) {
        rigidBody.current.setLinvel({ x: 0, y: linvel.y, z: 0 }, true);
      } else if (movement) {
        const sprintMultiplier = movement.sprint ? SPRINT_MULTIPLIER : 1;
        const moveForce = MOVE_SPEED * (grounded ? 1 : AIR_CONTROL) * sprintMultiplier;
        const nextVelocity = createMovementVelocity(movement.normalizedX, movement.normalizedZ, moveForce, linvel.y);
        const smoothing = grounded ? 0.35 : 0.18;
        nextVelocity.x = nextVelocity.x * smoothing + linvel.x * (1 - smoothing);
        nextVelocity.z = nextVelocity.z * smoothing + linvel.z * (1 - smoothing);
        rigidBody.current.setLinvel(nextVelocity, true);
      } else if (grounded) {
        rigidBody.current.setLinvel({ x: linvel.x * 0.82, y: linvel.y, z: linvel.z * 0.82 }, true);
      }

      const nearestPortal =
        portals
          .map((portal) => ({
            portal,
            distance: new Vector3(...(portal.interactionPosition ?? portal.position)).distanceTo(
              new Vector3(translation.x, 0, translation.z),
            ),
          }))
          .sort((a, b) => a.distance - b.distance)[0] ?? null;
      const activePortal = nearestPortal && nearestPortal.distance <= INTERACTION_DISTANCE ? nearestPortal.portal : null;

      if (activePortalRef.current?.id !== activePortal?.id) {
        activePortalRef.current = activePortal;
        onActivePortalChange(activePortal);
      }

      if (activePortal && !isInteractionPaused && keys.enter && state.clock.elapsedTime > interactionLockedUntil.current) {
        interactionLockedUntil.current = state.clock.elapsedTime + 0.5;
        onEnterProject(activePortal.targetType, {
          x: translation.x * 120 + 1300,
          y: translation.z * 120 + 460,
        });
      }
    });

    return (
      <RigidBody
        ref={rigidBody}
        colliders={false}
        position={[initialX, 4.2, initialZ]}
        enabledRotations={[false, false, false]}
        lockRotations
        gravityScale={3}
        friction={0.4}
        linearDamping={0.8}
        angularDamping={2}
        restitution={0}
        ccd
      >
        <group position={[0, 1.05, 0]}>
          <CapsuleCollider args={[0.65, 0.36]} />
        </group>
        <group ref={modelRef} position={[0, 0, 0]} scale={0.00007}>
          <CharacterModel isMoving={isMoving} isSprinting={isSprinting} />
        </group>
      </RigidBody>
    );
  },
);
