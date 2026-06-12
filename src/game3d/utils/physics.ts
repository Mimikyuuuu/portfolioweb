import { vec3 } from '@react-three/rapier';

export interface MovementInput {
  forward?: boolean;
  backward?: boolean;
  left?: boolean;
  right?: boolean;
  sprint?: boolean;
}

export function calculateMovement(input: MovementInput, moveSpeed: number) {
  let xImpulse = 0;
  let zImpulse = 0;

  if (input.forward) zImpulse -= moveSpeed;
  if (input.backward) zImpulse += moveSpeed;
  if (input.left) xImpulse -= moveSpeed;
  if (input.right) xImpulse += moveSpeed;

  const length = Math.sqrt(xImpulse * xImpulse + zImpulse * zImpulse);

  if (length === 0) {
    return null;
  }

  return {
    normalizedX: xImpulse / length,
    normalizedZ: zImpulse / length,
    sprint: input.sprint,
  };
}

export function createFallForce(fallMultiplier: number) {
  return vec3({ x: 0, y: -9.81 * (fallMultiplier - 1) * 0.016, z: 0 });
}

export function createMovementVelocity(normalizedX: number, normalizedZ: number, moveForce: number, currentY: number) {
  return vec3({
    x: normalizedX * moveForce,
    y: currentY,
    z: normalizedZ * moveForce,
  });
}
