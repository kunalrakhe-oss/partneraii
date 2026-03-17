import { useState, useEffect, useCallback } from "react";
import { Plus, Sparkles, Check, Trash2, ShoppingCart, ClipboardList, Gift, Plane, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { categorizeGroceryItem } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { useToast } from "@/hooks/use-toast";
import PageTransition from "@/components/PageTransition";
import type { Tables } from "@/integrations/supabase/types";

type GroceryRow = Tables<"grocery_items">;

const LIST_TABS = [
  { key: "grocery", label: "Grocery", emoji: "🛒" },
  { key: "todo", label: "To-Do", emoji: "📋" },
  { key: "gift", label: "Gift Ideas", emoji: "🎁" },
  { key: "travel", label: "Travel Pack", emoji: "✈️" },
  { key: "date", label: "Date Ideas", emoji: "💕" },
] as const;

type ListType = (typeof LIST_TABS)[number]["key"];

const LIST_CONFIG: Record<ListType, { placeholder: string; emptyEmoji: string; emptyText: string; emptyHint: string }> = {
  grocery: { placeholder: "Add milk, eggs, or bread...", emptyEmoji: "🛒", emptyText: "Your grocery list is empty", emptyHint: "Items are auto-categorized by AI" },
  todo: { placeholder: "Add a task...", emptyEmoji: "📋", emptyText: "No tasks yet", emptyHint: "Add shared to-dos for you & your partner" },
  gift: { placeholder: "Add a gift idea...", emptyEmoji: "🎁", emptyText: "No gift ideas yet", emptyHint: "Save ideas for birthdays, anniversaries & more" },
  travel: { placeholder: "Add a packing item...", emptyEmoji: "✈️", emptyText: "Your packing list is empty", emptyHint: "Plan your next trip together" },
  date: { placeholder: "Add a date idea...", emptyEmoji: "💕", emptyText: "No date ideas yet", emptyHint: "Collect fun things to do together" },
};

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
  const { partnerPair, loading: pairLoading, userId } = usePartnerPair();
  const { toast } = useToast();
  const [allItems, setAllItems] = useState<GroceryRow[]>([]);
  const [input, setInput] = useState("");
  const [showSuggestion, setShowSuggestion] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeList, setActiveList] = useState<ListType>("grocery");

  const fetchItems = useCallback(async () => {
    if (!partnerPair) return;
    const { data } = await supabase
      .from("grocery_items")
      .select("*")
      .eq("partner_pair", partnerPair)
      .order("created_at", { ascending: true });
    if (data) setAllItems(data);
    setLoading(false);
  }, [partnerPair]);

  useEffect(() => {
    if (pairLoading) return;
    if (!partnerPair) { setLoading(false); return; }
    fetchItems();
  }, [partnerPair, pairLoading, fetchItems]);

  useEffect(() => {
    if (!partnerPair) return;
    const channel = supabase
      .channel("grocery-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "grocery_items" }, () => {
        fetchItems();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [partnerPair, fetchItems]);

  // Filter items by active list type
  const items = allItems.filter(i => (i as any).list_type === activeList || (!((i as any).list_type) && activeList === "grocery"));
  const config = LIST_CONFIG[activeList];

  const addItem = async () => {
    if (!input.trim() || !userId || !partnerPair) return;
    const category = activeList === "grocery" ? categorizeGroceryItem(input.trim()) : "other";
    const { error } = await supabase.from("grocery_items").insert({
      name: input.trim(),
      category,
      user_id: userId,
      partner_pair: partnerPair,
      list_type: activeList,
    } as any);
    if (error) {
      toast({ title: "Error adding item", description: error.message, variant: "destructive" });
    } else {
      setInput("");
      fetchItems();
    }
  };

  const toggleItem = async (id: string, currentChecked: boolean) => {
    await supabase.from("grocery_items").update({ is_checked: !currentChecked }).eq("id", id);
    fetchItems();
  };

  const clearChecked = async () => {
    const checkedIds = items.filter(i => i.is_checked).map(i => i.id);
    if (checkedIds.length === 0) return;
    await supabase.from("grocery_items").delete().in("id", checkedIds);
    fetchItems();
  };

  const addSuggestion = async () => {
    if (!userId || !partnerPair) return;
    await supabase.from("grocery_items").insert({
      name: "Coffee Beans",
      category: "beverages",
      user_id: userId,
      partner_pair: partnerPair,
      list_type: "grocery",
    } as any);
    setShowSuggestion(false);
    fetchItems();
  };

  const uncheckedCount = items.filter(i => !i.is_checked).length;

  // Group by display category (only for grocery)
  const grouped: Record<string, GroceryRow[]> = {};
  if (activeList === "grocery") {
    items.forEach(item => {
      const display = CATEGORY_DISPLAY[item.category ?? "other"] || "OTHER";
      (grouped[display] = grouped[display] || []).push(item);
    });
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => Number(a.is_checked) - Number(b.is_checked));
    });
  }

  if (pairLoading || loading) {
    return (
      <PageTransition>
        <div className="px-5 pt-10 pb-6 flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </PageTransition>
    );
  }

  const sortedItems = activeList !== "grocery"
    ? [...items].sort((a, b) => Number(a.is_checked) - Number(b.is_checked))
    : [];

  return (
    <PageTransition>
      <div className="px-5 pt-10 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Love List</h1>
            <p className="text-xs text-muted-foreground">Shared list • {uncheckedCount} items left</p>
          </div>
          {activeList === "grocery" && (
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card shadow-card text-xs font-medium text-muted-foreground border border-border">
              <Sparkles size={12} /> AI Sorting
            </button>
          )}
        </div>

        {/* List Tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          {LIST_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveList(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors border ${
                activeList === tab.key
                  ? "bg-foreground text-background border-foreground shadow-soft"
                  : "bg-card shadow-card text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              <span className="text-sm">{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Add input */}
        <div className="flex gap-2 mt-4 mb-6">
          <div className="flex-1 bg-card rounded-2xl shadow-card border border-border flex items-center px-4 gap-3">
            <Plus size={18} className="text-muted-foreground shrink-0" />
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addItem()}
              placeholder={config.placeholder}
              className="flex-1 h-12 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <button onClick={addItem} className="px-5 h-12 rounded-2xl bg-foreground text-background text-sm font-semibold shadow-soft">
            Add
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">{config.emptyEmoji}</p>
            <p className="text-sm text-muted-foreground">{config.emptyText}</p>
            <p className="text-xs text-muted-foreground mt-1">{config.emptyHint}</p>
          </div>
        ) : activeList === "grocery" ? (
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
                      <ItemRow key={item.id} item={item} onToggle={toggleItem} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {sortedItems.map(item => (
                <ItemRow key={item.id} item={item} onToggle={toggleItem} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* LoveList Suggestion */}
        {showSuggestion && activeList === "grocery" && items.length > 0 && (
          <div className="love-gradient-soft border border-border rounded-2xl p-4 mt-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">💡</span>
              <p className="text-sm font-bold text-foreground">LoveList Suggestion</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              You usually buy Coffee Beans every 2 weeks. Add them to the list?
            </p>
            <div className="flex items-center gap-3">
              <button onClick={addSuggestion} className="px-4 py-1.5 rounded-full bg-card shadow-card text-xs font-medium text-foreground border border-border">
                Yes, please
              </button>
              <button onClick={() => setShowSuggestion(false)} className="text-xs text-muted-foreground font-medium">
                Not today
              </button>
            </div>
          </div>
        )}

        {/* Clear Completed */}
        {items.some(i => i.is_checked) && (
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

function ItemRow({ item, onToggle }: { item: GroceryRow; onToggle: (id: string, checked: boolean) => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      className={`bg-card rounded-2xl px-4 py-3.5 shadow-card flex items-center gap-3 border border-border ${item.is_checked ? "opacity-60" : ""}`}
    >
      <button
        onClick={() => onToggle(item.id, item.is_checked)}
        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
          item.is_checked ? "bg-success border-success" : "border-border"
        }`}
      >
        {item.is_checked && <Check size={14} className="text-success-foreground" />}
      </button>
      <span className={`flex-1 text-sm font-medium ${item.is_checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
        {item.name}
      </span>
    </motion.div>
  );
}
