import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Clock, Flame, UtensilsCrossed } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type Recipe = {
  ingredients: string[];
  instructions: string;
  prep_time?: string;
  calories?: number;
};

export type DietMealItem = {
  name: string;
  sets?: string;
  notes?: string;
  recipe?: Recipe;
};

type Props = {
  meal: DietMealItem;
  completable?: boolean;
  completed?: boolean;
  onToggleComplete?: (name: string) => void;
};

export default function DietPlanCard({ meal, completable, completed, onToggleComplete }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-start gap-3"
      >
        {completable && (
          <div
            onClick={(e) => { e.stopPropagation(); onToggleComplete?.(meal.name); }}
            className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
              completed ? "bg-primary border-transparent" : "border-border"
            }`}
          >
            {completed && <span className="text-primary-foreground text-xs">✓</span>}
          </div>
        )}
        <span className="text-xl mt-0.5">🍽️</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{meal.name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {meal.recipe?.calories && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                <Flame size={10} /> {meal.recipe.calories} cal
              </span>
            )}
            {meal.recipe?.prep_time && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                <Clock size={10} /> {meal.recipe.prep_time}
              </span>
            )}
            {meal.recipe && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20">
                Recipe
              </Badge>
            )}
          </div>
          {meal.notes && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{meal.notes}</p>
          )}
        </div>
        {expanded ? <ChevronUp size={16} className="text-muted-foreground mt-1 shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground mt-1 shrink-0" />}
      </button>

      {expanded && meal.recipe && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="px-4 pb-4 space-y-3"
        >
          {/* Ingredients */}
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-[11px] font-semibold text-foreground mb-1.5 flex items-center gap-1">
              <UtensilsCrossed size={11} /> Ingredients
            </p>
            <ul className="space-y-0.5">
              {meal.recipe.ingredients.map((ing, i) => (
                <li key={i} className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{ing}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-[11px] font-semibold text-foreground mb-1">📝 Instructions</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line">{meal.recipe.instructions}</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
