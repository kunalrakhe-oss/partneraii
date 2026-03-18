import { motion } from "framer-motion";
import RecoveryPlanCard, { type Exercise } from "./RecoveryPlanCard";

type Props = {
  title: string;
  description?: string;
  icon?: string;
  duration?: string;
  exercises: Exercise[];
  accentColor?: string;
  onGenerateImage?: (exercise: Exercise) => Promise<string | null>;
  extraContent?: React.ReactNode;
};

export default function PlanPhaseSection({ title, description, icon, duration, exercises, accentColor, onGenerateImage, extraContent }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Phase header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg shrink-0">
          {icon || "📋"}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          {duration && (
            <p className="text-[11px] text-primary font-medium">{duration}</p>
          )}
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
      </div>

      {/* Exercises */}
      <div className="space-y-2 ml-1">
        {exercises.map((exercise, i) => (
          <RecoveryPlanCard
            key={i}
            exercise={exercise}
            accentColor={accentColor}
            onGenerateImage={onGenerateImage}
          />
        ))}
      </div>

      {/* Extra content like nutrition tips, mental health */}
      {extraContent}
    </motion.div>
  );
}
