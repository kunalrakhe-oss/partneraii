import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocalStorage, generateId, categorizeGroceryItem, GROCERY_CATEGORIES, type GroceryItem } from "@/lib/store";
import PageTransition from "@/components/PageTransition";

export default function GroceryPage() {
  const [items, setItems] = useLocalStorage<GroceryItem[]>("lovelist-groceries", []);
  const [input, setInput] = useState("");

  const addItem = () => {
    if (!input.trim()) return;
    const category = categorizeGroceryItem(input.trim());
    setItems([...items, { id: generateId(), name: input.trim(), category, checked: false }]);
    setInput("");
  };

  const toggleItem = (id: string) => {
    setItems(items.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const clearChecked = () => {
    setItems(items.filter(i => !i.checked));
  };

  // Group by category
  const grouped = items.reduce<Record<string, GroceryItem[]>>((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});

  return (
    <PageTransition>
      <div className="px-5 pt-10 pb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-foreground">Grocery List</h1>
          {items.some(i => i.checked) && (
            <button onClick={clearChecked} className="text-xs text-primary font-medium">Clear checked</button>
          )}
        </div>

        {/* Add input */}
        <div className="flex gap-2 mb-6">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addItem()}
            placeholder="Add item (e.g. Milk, Apples...)"
            className="flex-1 h-11 px-4 rounded-xl bg-card shadow-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button onClick={addItem} className="w-11 h-11 rounded-xl love-gradient flex items-center justify-center shadow-soft">
            <Plus size={18} className="text-primary-foreground" />
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
            {Object.entries(grouped).map(([category, categoryItems]) => (
              <div key={category}>
                <h3 className="text-xs font-semibold text-muted-foreground mb-2">
                  {GROCERY_CATEGORIES[category] || category}
                </h3>
                <div className="space-y-1">
                  <AnimatePresence>
                    {categoryItems.map(item => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        className="bg-card rounded-xl px-4 py-3 shadow-card flex items-center gap-3"
                      >
                        <button
                          onClick={() => toggleItem(item.id)}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                            item.checked ? "bg-primary border-primary" : "border-border"
                          }`}
                        >
                          {item.checked && <span className="text-primary-foreground text-xs">✓</span>}
                        </button>
                        <span className={`flex-1 text-sm ${item.checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {item.name}
                        </span>
                        <button onClick={() => deleteItem(item.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
