import { useEffect, useRef, useState } from 'react';
import { useMobileControls } from '../contexts/MobileControlsContext';

export function MobileControls() {
  const { setMovement } = useMobileControls();
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickPosition, setJoystickPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isDragging) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      setJoystickPosition((position) => ({
        x: position.x * 0.72,
        y: position.y * 0.72,
      }));
    });

    return () => cancelAnimationFrame(frame);
  }, [isDragging, joystickPosition]);

  const updateJoystick = (event: React.TouchEvent | React.MouseEvent) => {
    if (!joystickRef.current) {
      return;
    }

    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const clientX = 'touches' in event ? event.touches[0]?.clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0]?.clientY : event.clientY;

    if (clientX === undefined || clientY === undefined) {
      return;
    }

    const radius = rect.width / 2;
    let deltaX = clientX - centerX;
    let deltaY = clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > radius) {
      deltaX = (deltaX / distance) * radius;
      deltaY = (deltaY / distance) * radius;
    }

    setJoystickPosition({ x: deltaX, y: deltaY });
    setMovement({ x: deltaX / radius, y: deltaY / radius });
  };

  const startJoystick = (event: React.TouchEvent | React.MouseEvent) => {
    event.preventDefault();
    setIsDragging(true);
    updateJoystick(event);
  };

  const stopJoystick = () => {
    setIsDragging(false);
    setJoystickPosition({ x: 0, y: 0 });
    setMovement({ x: 0, y: 0 });
  };

  return (
    <div className="mobile-3d-controls">
      <div
        ref={joystickRef}
        className="mobile-3d-controls__joystick"
        onMouseDown={startJoystick}
        onMouseLeave={stopJoystick}
        onMouseMove={(event) => {
          if (isDragging) updateJoystick(event);
        }}
        onMouseUp={stopJoystick}
        onTouchEnd={stopJoystick}
        onTouchMove={updateJoystick}
        onTouchStart={startJoystick}
      >
        <div
          className="mobile-3d-controls__thumb"
          style={{ transform: `translate(${joystickPosition.x}px, ${joystickPosition.y}px)` }}
        />
      </div>
    </div>
  );
}
