import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type PageFabAction = {
  label: string;
  icon: LucideIcon;
  onTap: () => void;
};

type PageFabContextType = {
  actions: PageFabAction[];
  setActions: (actions: PageFabAction[]) => void;
};

const PageFabContext = createContext<PageFabContextType>({
  actions: [],
  setActions: () => {},
});

export function PageFabProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<PageFabAction[]>([]);
  return (
    <PageFabContext.Provider value={{ actions, setActions }}>
      {children}
    </PageFabContext.Provider>
  );
}

export function usePageFab(actions: PageFabAction[]) {
  const ctx = useContext(PageFabContext);
  useEffect(() => {
    ctx.setActions(actions);
    return () => ctx.setActions([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function usePageFabActions() {
  return useContext(PageFabContext).actions;
}
