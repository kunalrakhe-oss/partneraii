import { useState } from "react";
import { Plus, Sparkles, Check, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocalStorage, generateId, categorizeGroceryItem, type GroceryItem } from "@/lib/store";
import PageTransition from "@/components/PageTransition";

const CATEGORY_DISPLAY: Record<string, string> = {
  fruits: "PRODUCE",
  vegetables: "PRODUCE",
  dairy: "DAIRY & EGGS",
  meat: "MEAT & SEAFOOD",
  household: "HOUSEHOLD",
  snacks: "SNACKS",
  beverages: "BEVERAGES",
  bakery: "BAKERY",
  other: "OTHER",
};

const CATEGORY_COLOR: Record<string, string> = {
  PRODUCE: "bg-success",
  "DAIRY & EGGS": "bg-primary",
  "MEAT & SEAFOOD": "bg-accent",
  HOUSEHOLD: "bg-warning",
  SNACKS: "bg-secondary",
  BEVERAGES: "bg-[hsl(210,60%,55%)]",
  BAKERY: "bg-[hsl(24,80%,58%)]",
  OTHER: "bg-muted-foreground",
};

export default function GroceryPage() {
  const [items, setItems] = useLocalStorage<GroceryItem[]>("lovelist-groceries", []);
  const [input, setInput] = useState("");
  const [showSuggestion, setShowSuggestion] = useState(true);

  const addItem = () => {
    if (!input.trim()) return;
    const category = categorizeGroceryItem(input.trim());
    setItems([...items, { id: generateId(), name: input.trim(), category, checked: false }]);
    setInput("");
  };

  const toggleItem = (id: string) => {
    setItems(items.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  };

  const clearChecked = () => {
    setItems(items.filter(i => !i.checked));
  };

  const uncheckedCount = items.filter(i => !i.checked).length;

  // Group by display category
  const grouped: Record<string, GroceryItem[]> = {};
  items.forEach(item => {
    const display = CATEGORY_DISPLAY[item.category] || "OTHER";
    (grouped[display] = grouped[display] || []).push(item);
  });

  // Sort: unchecked first within each group
  Object.keys(grouped).forEach(key => {
    grouped[key].sort((a, b) => Number(a.checked) - Number(b.checked));
  });

  return (
    <PageTransition>
      <div className="px-5 pt-10 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Grocery List</h1>
            <p className="text-xs text-muted-foreground">Shared with Alex • {uncheckedCount} items left</p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card shadow-card text-xs font-medium text-muted-foreground border border-border">
            <Sparkles size={12} /> AI Sorting
          </button>
        </div>

        {/* Add input */}
        <div className="flex gap-2 mt-5 mb-6">
          <div className="flex-1 bg-card rounded-2xl shadow-card border border-border flex items-center px-4 gap-3">
            <Plus size={18} className="text-muted-foreground shrink-0" />
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addItem()}
              placeholder="Add milk, eggs, or bread..."
              className="flex-1 h-12 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <button onClick={addItem} className="px-5 h-12 rounded-2xl bg-foreground text-background text-sm font-semibold shadow-soft">
            Add
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🛒</p>
            <p className="text-sm text-muted-foreground">Your grocery list is empty</p>
            <p className="text-xs text-muted-foreground mt-1">Items are auto-categorized by AI</p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(grouped).map(([displayCat, catItems]) => (
              <div key={displayCat}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-1 h-4 rounded-full ${CATEGORY_COLOR[displayCat] || "bg-muted-foreground"}`} />
                  <h3 className="text-xs font-bold text-muted-foreground tracking-wider">{displayCat}</h3>
                </div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {catItems.map(item => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        className={`bg-card rounded-2xl px-4 py-3.5 shadow-card flex items-center gap-3 border border-border ${item.checked ? "opacity-60" : ""}`}
                      >
                        <button
                          onClick={() => toggleItem(item.id)}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                            item.checked ? "bg-success border-success" : "border-border"
                          }`}
                        >
                          {item.checked && <Check size={14} className="text-success-foreground" />}
                        </button>
                        <span className={`flex-1 text-sm font-medium ${item.checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {item.name}
                        </span>
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-[10px] font-bold text-muted-foreground">A</span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LoveList Suggestion */}
        {showSuggestion && (
          <div className="love-gradient-soft border border-border rounded-2xl p-4 mt-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">💡</span>
              <p className="text-sm font-bold text-foreground">LoveList Suggestion</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              You usually buy Coffee Beans every 2 weeks. Add them to the list?
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setItems([...items, { id: generateId(), name: "Coffee Beans", category: "beverages", checked: false }]);
                  setShowSuggestion(false);
                }}
                className="px-4 py-1.5 rounded-full bg-card shadow-card text-xs font-medium text-foreground border border-border"
              >
                Yes, please
              </button>
              <button
                onClick={() => setShowSuggestion(false)}
                className="text-xs text-muted-foreground font-medium"
              >
                Not today
              </button>
            </div>
          </div>
        )}

        {/* Clear Completed FAB */}
        {items.some(i => i.checked) && (
          <div className="flex justify-center mt-6">
            <button
              onClick={clearChecked}
              className="bg-primary/80 text-primary-foreground px-6 py-3 rounded-full flex items-center gap-2 shadow-soft text-sm font-semibold"
            >
              <Trash2 size={16} /> Clear Completed
            </button>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
