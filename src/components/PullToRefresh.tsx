import { useState, useRef, useCallback, type ReactNode } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 80;
const MAX_PULL = 120;

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh?: () => Promise<void> | void;
}

export default function PullToRefresh({ children, onRefresh }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const pullDistance = useMotionValue(0);

  const indicatorY = useTransform(pullDistance, [0, MAX_PULL], [0, MAX_PULL]);
  const indicatorOpacity = useTransform(pullDistance, [0, THRESHOLD * 0.5, THRESHOLD], [0, 0.5, 1]);
  const indicatorRotation = useTransform(pullDistance, [0, THRESHOLD], [0, 180]);

  const isAtTop = useCallback(() => {
    const el = containerRef.current;
    if (!el) return false;
    return el.scrollTop <= 0;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (refreshing) return;
    if (isAtTop()) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, [refreshing, isAtTop]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && isAtTop()) {
      const dampened = Math.min(dy * 0.5, MAX_PULL);
      pullDistance.set(dampened);
    } else {
      pullDistance.set(0);
    }
  }, [refreshing, isAtTop, pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    const currentPull = pullDistance.get();

    if (currentPull >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      pullDistance.set(60);
      try {
        if (onRefresh) {
          await onRefresh();
        } else {
          window.location.reload();
        }
      } finally {
        setRefreshing(false);
        pullDistance.set(0);
      }
    } else {
      pullDistance.set(0);
    }
  }, [pullDistance, refreshing, onRefresh]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto pb-nav relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute left-0 right-0 flex items-center justify-center z-40 pointer-events-none"
        style={{ top: 0, y: indicatorY, opacity: indicatorOpacity }}
      >
        <div className="w-9 h-9 rounded-full bg-card shadow-card flex items-center justify-center -mt-10">
          <motion.div style={{ rotate: refreshing ? undefined : indicatorRotation }}>
            <RefreshCw
              size={18}
              className={`text-primary ${refreshing ? "animate-spin" : ""}`}
            />
          </motion.div>
        </div>
      </motion.div>

      {children}
    </div>
  );
}
