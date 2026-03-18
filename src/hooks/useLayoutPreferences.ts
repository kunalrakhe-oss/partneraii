import { useState, useCallback } from "react";

// Nav bar tab definitions
export const ALL_NAV_TABS = [
  { id: "home", to: "/", label: "Home" },
  { id: "calendar", to: "/calendar", label: "Calendar" },
  { id: "lists", to: "/lists", label: "Lists" },
  { id: "chat", to: "/chat", label: "Chat" },
  { id: "chores", to: "/chores", label: "Chores" },
] as const;

// Home screen widget definitions
export const ALL_HOME_WIDGETS = [
  { id: "next-event", label: "Next Event" },
  { id: "partnership-stats", label: "Partnership Stats" },
  { id: "mood-check", label: "Daily Mood Check" },
  { id: "partner-mood", label: "Partner's Mood" },
  { id: "today-agenda", label: "Today's Agenda" },
  { id: "add-memory", label: "Add Memory" },
  { id: "quick-links", label: "Quick Links" },
  { id: "urgent-chores", label: "Urgent Chores" },
  { id: "ai-insight", label: "AI Insight" },
] as const;

export type NavTabId = (typeof ALL_NAV_TABS)[number]["id"];
export type HomeWidgetId = (typeof ALL_HOME_WIDGETS)[number]["id"];

const NAV_KEY = "lovelist-nav-tabs";
const WIDGETS_KEY = "lovelist-home-widgets";

const DEFAULT_NAV: NavTabId[] = ["home", "calendar", "lists", "chat", "chores"];
const DEFAULT_WIDGETS: HomeWidgetId[] = [
  "next-event", "partnership-stats", "mood-check", "partner-mood",
  "today-agenda", "add-memory", "quick-links", "urgent-chores", "ai-insight",
];

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

const dispatchChange = () => window.dispatchEvent(new Event("layout-prefs-changed"));

export function useLayoutPreferences() {
  const [navTabs, setNavTabsState] = useState<NavTabId[]>(() => load(NAV_KEY, DEFAULT_NAV));
  const [homeWidgets, setHomeWidgetsState] = useState<HomeWidgetId[]>(() => load(WIDGETS_KEY, DEFAULT_WIDGETS));

  const setNavTabs = useCallback((tabs: NavTabId[]) => {
    const withHome = tabs.includes("home") ? tabs : ["home" as NavTabId, ...tabs];
    setNavTabsState(withHome);
    localStorage.setItem(NAV_KEY, JSON.stringify(withHome));
    dispatchChange();
  }, []);

  const setHomeWidgets = useCallback((widgets: HomeWidgetId[]) => {
    setHomeWidgetsState(widgets);
    localStorage.setItem(WIDGETS_KEY, JSON.stringify(widgets));
    dispatchChange();
  }, []);

  const toggleNavTab = useCallback((id: NavTabId) => {
    setNavTabsState(prev => {
      const next = prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id];
      // Must have at least home + 1 other
      if (next.length < 2) return prev;
      if (!next.includes("home")) return prev;
      localStorage.setItem(NAV_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleHomeWidget = useCallback((id: HomeWidgetId) => {
    setHomeWidgetsState(prev => {
      const next = prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id];
      localStorage.setItem(WIDGETS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetDefaults = useCallback(() => {
    setNavTabsState(DEFAULT_NAV);
    setHomeWidgetsState(DEFAULT_WIDGETS);
    localStorage.setItem(NAV_KEY, JSON.stringify(DEFAULT_NAV));
    localStorage.setItem(WIDGETS_KEY, JSON.stringify(DEFAULT_WIDGETS));
  }, []);

  return {
    navTabs,
    homeWidgets,
    setNavTabs,
    setHomeWidgets,
    toggleNavTab,
    toggleHomeWidget,
    resetDefaults,
  };
}

// Static reader for components outside React (or for initial render)
export function getNavTabs(): NavTabId[] {
  return load(NAV_KEY, DEFAULT_NAV);
}

export function getHomeWidgets(): HomeWidgetId[] {
  return load(WIDGETS_KEY, DEFAULT_WIDGETS);
}
