import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, ImageIcon, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export type Exercise = {
  name: string;
  description?: string;
  sets?: number;
  reps?: string;
  holdTime?: string;
  difficulty?: string;
  formTips?: string;
  icon?: string;
  imagePrompt?: string;
  modification?: string;
};

type Props = {
  exercise: Exercise;
  accentColor?: string;
  onGenerateImage?: (exercise: Exercise) => Promise<string | null>;
  completable?: boolean;
  completed?: boolean;
  onToggleComplete?: (name: string) => void;
};

const difficultyColors: Record<string, string> = {
  Easy: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  Gentle: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  Moderate: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  Challenging: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

export default function RecoveryPlanCard({ exercise, accentColor = "emerald", onGenerateImage, completable, completed, onToggleComplete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const handleGenerateImage = async () => {
    if (imageUrl || imageLoading || !onGenerateImage) return;
    setImageLoading(true);
    try {
      const url = await onGenerateImage(exercise);
      setImageUrl(url);
    } catch {
      // silently fail
    }
    setImageLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      {/* Main card */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-start gap-3"
      >
        {completable && (
          <div
            onClick={(e) => { e.stopPropagation(); onToggleComplete?.(exercise.name); }}
            className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
              completed ? "bg-primary border-transparent" : "border-border"
            }`}
          >
            {completed && <span className="text-primary-foreground text-xs">✓</span>}
          </div>
        )}
        <span className="text-xl mt-0.5">{exercise.icon || "🏋️"}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{exercise.name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {exercise.sets && (
              <span className="text-[11px] text-muted-foreground">
                {exercise.sets} sets × {exercise.reps || "—"}
              </span>
            )}
            {exercise.holdTime && (
              <span className="text-[11px] text-muted-foreground">
                Hold: {exercise.holdTime}
              </span>
            )}
            {exercise.difficulty && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${difficultyColors[exercise.difficulty] || ""}`}>
                {exercise.difficulty}
              </Badge>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-muted-foreground mt-1 shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground mt-1 shrink-0" />}
      </button>

      {/* Expanded details */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="px-4 pb-4 space-y-3"
        >
          {exercise.description && (
            <p className="text-xs text-muted-foreground leading-relaxed">{exercise.description}</p>
          )}

          {exercise.formTips && (
            <div className="bg-muted/50 rounded-xl p-2.5">
              <p className="text-[11px] font-medium text-foreground mb-0.5">💡 Form Tip</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{exercise.formTips}</p>
            </div>
          )}

          {exercise.modification && (
            <div className="bg-muted/50 rounded-xl p-2.5">
              <p className="text-[11px] font-medium text-foreground mb-0.5">🔄 Modification</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{exercise.modification}</p>
            </div>
          )}

          {/* Image section */}
          {imageUrl ? (
            <div className="rounded-xl overflow-hidden">
              <img src={imageUrl} alt={exercise.name} className="w-full h-40 object-cover rounded-xl" />
            </div>
          ) : onGenerateImage ? (
            <button
              onClick={handleGenerateImage}
              disabled={imageLoading}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50`}
            >
              {imageLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Generating illustration...
                </>
              ) : (
                <>
                  <ImageIcon size={14} />
                  Show exercise illustration
                </>
              )}
            </button>
          ) : null}
        </motion.div>
      )}
    </motion.div>
  );
}
