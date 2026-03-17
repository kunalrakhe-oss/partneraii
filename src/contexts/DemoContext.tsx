import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface DemoContextType {
  isDemoMode: boolean;
  exitDemo: () => void;
}

const DemoContext = createContext<DemoContextType>({ isDemoMode: false, exitDemo: () => {} });

export function DemoProvider({ children }: { children: ReactNode }) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("lovelist-demo-dismissed") === "true");

  const isDemoMode = !dismissed;

  const exitDemo = useCallback(() => {
    localStorage.setItem("lovelist-demo-dismissed", "true");
    setDismissed(true);
  }, []);

  return (
    <DemoContext.Provider value={{ isDemoMode, exitDemo }}>
      {children}
    </DemoContext.Provider>
  );
}

export const useDemo = () => useContext(DemoContext);
