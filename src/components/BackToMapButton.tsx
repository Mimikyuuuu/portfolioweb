import { useEffect } from 'react';

interface BackToMapButtonProps {
  onBack: () => void;
}

export function BackToMapButton({ onBack }: BackToMapButtonProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  return (
    <button className="back-button" type="button" onClick={onBack}>
      ← 返回地图
    </button>
  );
}
