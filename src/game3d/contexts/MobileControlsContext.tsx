import { createContext, useContext, useState, type ReactNode } from 'react';

interface MobileControlsContextValue {
  movement: { x: number; y: number };
  setMovement: (value: { x: number; y: number }) => void;
}

const MobileControlsContext = createContext<MobileControlsContextValue>({
  movement: { x: 0, y: 0 },
  setMovement: () => {},
});

export function MobileControlsProvider({ children }: { children: ReactNode }) {
  const [movement, setMovement] = useState({ x: 0, y: 0 });

  return (
    <MobileControlsContext.Provider value={{ movement, setMovement }}>
      {children}
    </MobileControlsContext.Provider>
  );
}

export function useMobileControls() {
  return useContext(MobileControlsContext);
}
