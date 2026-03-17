import { useState, useEffect, useCallback } from "react";
import { Plus, Sparkles, Check, Trash2, ShoppingCart, ClipboardList, Gift, Plane, Heart, ChevronUp, ChevronDown, X, CalendarIcon, Clock, Flag, AlertTriangle, FileText, ChevronRight } from "lucide-react";
import { MediaPicker, uploadAttachment } from "@/components/MediaPicker";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import ProfileButton from "@/components/ProfileButton";
import { categorizeGroceryItem } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { useToast } from "@/hooks/use-toast";
import PageTransition from "@/components/PageTransition";
import type { Tables } from "@/integrations/supabase/types";
import { useDemo } from "@/contexts/DemoContext";
import { DEMO_GROCERY_ITEMS } from "@/lib/demoData";

type GroceryRow = Tables<"grocery_items">;

const DEFAULT_TABS = [
  { key: "grocery", label: "Grocery", emoji: "🛒" },
  { key: "todo", label: "To-Do", emoji: "📋" },
  { key: "gift", label: "Gift Ideas", emoji: "🎁" },
  { key: "travel", label: "Travel Pack", emoji: "✈️" },
  { key: "date", label: "Date Ideas", emoji: "💕" },
] as const;

type ListType = string;

const DEFAULT_LIST_CONFIG: Record<string, { placeholder: string; emptyEmoji: string; emptyText: string; emptyHint: string }> = {
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
  const { isDemoMode } = useDemo();
  const [allItems, setAllItems] = useState<GroceryRow[]>([]);
  const [input, setInput] = useState("");
  const [showSuggestion, setShowSuggestion] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeList, setActiveList] = useState<ListType>("grocery");
  const [editingItem, setEditingItem] = useState<GroceryRow | null>(null);
  const [customLists, setCustomLists] = useState<{ key: string; label: string; emoji: string }[]>([]);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListEmoji, setNewListEmoji] = useState("📝");

  const LIST_TABS = [...DEFAULT_TABS, ...customLists];
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!partnerPair) return;
    const { data } = await supabase
      .from("grocery_items")
      .select("*")
      .eq("partner_pair", partnerPair)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (data) setAllItems(data);
    setLoading(false);
  }, [partnerPair]);

  useEffect(() => {
    if (pairLoading) return;
    if (!partnerPair) { setLoading(false); return; }
    fetchItems();
  }, [partnerPair, pairLoading, fetchItems]);

  // Inject demo data when in demo mode and no real data
  useEffect(() => {
    if (isDemoMode && !pairLoading && allItems.length === 0) {
      setAllItems(DEMO_GROCERY_ITEMS as any);
      setLoading(false);
    }
  }, [isDemoMode, pairLoading, allItems.length]);

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
  const config = DEFAULT_LIST_CONFIG[activeList] || { placeholder: `Add to ${activeList}...`, emptyEmoji: "📝", emptyText: `Your ${activeList} list is empty`, emptyHint: "Start adding items" };

  const addItem = async () => {
    if (!input.trim() || !userId || !partnerPair) return;
    const category = activeList === "grocery" ? categorizeGroceryItem(input.trim()) : "other";
    // New items get sort_order higher than current max
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => (i as any).sort_order ?? 0)) : 0;
    const { error } = await supabase.from("grocery_items").insert({
      name: input.trim(),
      category,
      user_id: userId,
      partner_pair: partnerPair,
      list_type: activeList,
      sort_order: maxOrder + 1,
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

  const moveItem = async (id: string, direction: "up" | "down") => {
    const unchecked = items.filter(i => !i.is_checked);
    const idx = unchecked.findIndex(i => i.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= unchecked.length) return;

    const current = unchecked[idx];
    const swap = unchecked[swapIdx];
    const currentOrder = (current as any).sort_order ?? 0;
    const swapOrder = (swap as any).sort_order ?? 0;

    // Optimistic update
    setAllItems(prev => prev.map(i => {
      if (i.id === current.id) return { ...i, sort_order: swapOrder } as any;
      if (i.id === swap.id) return { ...i, sort_order: currentOrder } as any;
      return i;
    }));

    await Promise.all([
      supabase.from("grocery_items").update({ sort_order: swapOrder } as any).eq("id", current.id),
      supabase.from("grocery_items").update({ sort_order: currentOrder } as any).eq("id", swap.id),
    ]);
    fetchItems();
  };

  const saveItem = async (id: string, updates: Record<string, any>) => {
    await supabase.from("grocery_items").update(updates as any).eq("id", id);
    setAllItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    setEditingItem(null);
  };

  const deleteItem = async (id: string) => {
    await supabase.from("grocery_items").delete().eq("id", id);
    setEditingItem(null);
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
      grouped[key].sort((a, b) => Number(a.is_checked) - Number(b.is_checked) || ((a as any).sort_order ?? 0) - ((b as any).sort_order ?? 0));
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
    ? [...items].sort((a, b) => Number(a.is_checked) - Number(b.is_checked) || ((a as any).sort_order ?? 0) - ((b as any).sort_order ?? 0))
    : [];

  const uncheckedItems = activeList !== "grocery" ? sortedItems.filter(i => !i.is_checked) : [];

  return (
    <PageTransition>
      <div className="px-5 pt-10 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <ProfileButton />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Love List</h1>
              <p className="text-xs text-muted-foreground">Shared list • {uncheckedCount} items left</p>
            </div>
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
          <button
            onClick={() => setShowNewList(true)}
            className="flex items-center gap-1 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap shrink-0 border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-colors"
          >
            <Plus size={12} />
            New List
          </button>
        </div>

        {/* New List Form */}
        <AnimatePresence>
          {showNewList && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="bg-card rounded-2xl p-4 border border-border shadow-card mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground">Create New List</p>
                  <button onClick={() => setShowNewList(false)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                    <X size={12} className="text-muted-foreground" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const emojis = ["📝", "🏠", "🎯", "💼", "🎮", "📚", "🎵", "🍳", "⚽", "🌱"];
                      const idx = emojis.indexOf(newListEmoji);
                      setNewListEmoji(emojis[(idx + 1) % emojis.length]);
                    }}
                    className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0"
                  >
                    {newListEmoji}
                  </button>
                  <input
                    value={newListName}
                    onChange={e => setNewListName(e.target.value)}
                    placeholder="List name..."
                    className="flex-1 bg-muted rounded-xl px-3 h-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={() => {
                      if (!newListName.trim()) return;
                      const key = newListName.trim().toLowerCase().replace(/\s+/g, "-");
                      setCustomLists(prev => [...prev, { key, label: newListName.trim(), emoji: newListEmoji }]);
                      setActiveList(key);
                      setNewListName("");
                      setNewListEmoji("📝");
                      setShowNewList(false);
                    }}
                    disabled={!newListName.trim()}
                    className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
                  >
                    Create
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add input */}
        <div className="flex gap-2 mt-4 mb-2">
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

        {/* AI Suggestions */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto">
          <button
            onClick={async () => {
              setAiLoading(true);
              try {
                const { data } = await supabase.functions.invoke("ai-assist", {
                  body: { type: "list-suggest", context: { listType: activeList, items: items.map(i => i.name).join(", ") } },
                });
                if (data?.result) {
                  setAiSuggestions(data.result.split(",").map((s: string) => s.trim()).filter(Boolean).slice(0, 5));
                }
              } catch { /* ignore */ }
              setAiLoading(false);
            }}
            disabled={aiLoading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0 disabled:opacity-50"
          >
            <Sparkles size={12} />
            {aiLoading ? "Thinking..." : "AI Suggest"}
          </button>
          {aiSuggestions.map(s => (
            <button
              key={s}
              onClick={() => { setInput(s); setAiSuggestions(prev => prev.filter(x => x !== s)); }}
              className="px-3 py-1.5 rounded-full bg-card border border-border text-xs font-medium text-foreground shrink-0 whitespace-nowrap hover:bg-muted"
            >
              + {s}
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">{config.emptyEmoji}</p>
            <p className="text-sm text-muted-foreground">{config.emptyText}</p>
            <p className="text-xs text-muted-foreground mt-1">{config.emptyHint}</p>
          </div>
        ) : activeList === "grocery" ? (
          <div className="space-y-5">
            {Object.entries(grouped).map(([displayCat, catItems]) => {
              const uncheckedCat = catItems.filter(i => !i.is_checked);
              return (
                <div key={displayCat}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-1 h-4 rounded-full ${CATEGORY_COLOR[displayCat] || "bg-muted-foreground"}`} />
                    <h3 className="text-xs font-bold text-muted-foreground tracking-wider">{displayCat}</h3>
                  </div>
                  <div className="space-y-2">
                    <AnimatePresence>
                      {catItems.map(item => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          onToggle={toggleItem}
                          onMove={moveItem}
                          onEdit={setEditingItem}
                          isFirst={uncheckedCat[0]?.id === item.id}
                          isLast={uncheckedCat[uncheckedCat.length - 1]?.id === item.id}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {sortedItems.map(item => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onToggle={toggleItem}
                  onMove={moveItem}
                  onEdit={setEditingItem}
                  isFirst={uncheckedItems[0]?.id === item.id}
                  isLast={uncheckedItems[uncheckedItems.length - 1]?.id === item.id}
                />
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

      {/* Edit Task Bottom Sheet */}
      <AnimatePresence>
        {editingItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => setEditingItem(null)}
            />
            <EditSheet
              item={editingItem}
              onSave={saveItem}
              onDelete={deleteItem}
              onClose={() => setEditingItem(null)}
            />
          </>
        )}
      </AnimatePresence>

        {/* Floating Add Button */}
        <button
          onClick={() => setShowNewList(true)}
          className="fixed bottom-20 right-5 w-14 h-14 rounded-full love-gradient text-primary-foreground flex items-center justify-center shadow-elevated z-40"
        >
          <Plus size={24} />
        </button>
    </PageTransition>
  );
}

const PRIORITY_OPTIONS = [
  { value: "none", label: "None" },
  { value: "low", label: "Low", color: "text-blue-500" },
  { value: "medium", label: "Medium", color: "text-warning" },
  { value: "high", label: "High", color: "text-destructive" },
];

function EditSheet({
  item,
  onSave,
  onDelete,
  onClose,
}: {
  item: GroceryRow;
  onSave: (id: string, updates: Record<string, any>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [notes, setNotes] = useState((item as any).notes || "");
  const [dueDate, setDueDate] = useState<Date | undefined>(
    (item as any).due_date ? new Date((item as any).due_date) : undefined
  );
  const [showDate, setShowDate] = useState(!!((item as any).due_date));
  const [isFlagged, setIsFlagged] = useState((item as any).is_flagged || false);
  const [priority, setPriority] = useState((item as any).priority || "none");
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState("");

  const handleSave = async () => {
    if (!name.trim()) return;
    let imageUrl = (item as any).image_url || null;
    if (imgFile) {
      const uploaded = await uploadAttachment(imgFile, item.user_id);
      if (uploaded) imageUrl = uploaded;
    }
    onSave(item.id, {
      name: name.trim(),
      notes: notes.trim() || null,
      due_date: showDate && dueDate ? format(dueDate, "yyyy-MM-dd") : null,
      is_flagged: isFlagged,
      priority,
      image_url: imageUrl,
    });
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 350 }}
      className="fixed bottom-20 left-0 right-0 z-[60] max-w-lg mx-auto"
    >
      <div className="bg-card rounded-t-3xl border border-border border-b-0 shadow-lg max-h-[72vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-card z-10 px-5 pt-4 pb-2">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <X size={16} className="text-muted-foreground" />
            </button>
            <h3 className="text-sm font-bold text-foreground">Task Details</h3>
            <button
              onClick={handleSave}
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"
            >
              <Check size={16} className="text-primary-foreground" />
            </button>
          </div>
        </div>

        <div className="px-5 pb-10 space-y-4 overflow-y-auto flex-1">
          {/* Name & Notes */}
          <div className="bg-muted/50 rounded-2xl p-4 space-y-3 border border-border">
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Task name"
              className="w-full text-lg font-bold text-foreground bg-transparent focus:outline-none placeholder:text-muted-foreground"
            />
            <div className="h-px bg-border" />
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notes"
              rows={2}
              className="w-full text-sm text-foreground bg-transparent focus:outline-none placeholder:text-muted-foreground resize-none"
            />
          </div>

          {/* Date & Time */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Date & Time</p>
            <div className="bg-muted/50 rounded-2xl border border-border divide-y divide-border">
              {/* Date toggle */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <CalendarIcon size={16} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Date</p>
                  {showDate && dueDate && (
                    <p className="text-xs text-primary font-medium">{format(dueDate, "EEEE, MMMM d, yyyy")}</p>
                  )}
                </div>
                <button
                  onClick={() => { setShowDate(!showDate); if (!showDate && !dueDate) setDueDate(new Date()); }}
                  className={`w-11 h-6 rounded-full transition-colors ${showDate ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <motion.div
                    animate={{ x: showDate ? 20 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="w-5 h-5 rounded-full bg-card shadow-sm"
                  />
                </button>
              </div>

              {/* Calendar (shown when date enabled) */}
              <AnimatePresence>
                {showDate && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-2 py-2">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={d => { if (d) setDueDate(d); }}
                        className={cn("p-2 pointer-events-auto")}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Flag */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-warning/15 flex items-center justify-center">
                  <Flag size={16} className="text-warning" />
                </div>
                <p className="flex-1 text-sm font-medium text-foreground">Flag</p>
                <button
                  onClick={() => setIsFlagged(!isFlagged)}
                  className={`w-11 h-6 rounded-full transition-colors ${isFlagged ? "bg-warning" : "bg-muted-foreground/30"}`}
                >
                  <motion.div
                    animate={{ x: isFlagged ? 20 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="w-5 h-5 rounded-full bg-card shadow-sm"
                  />
                </button>
              </div>

              {/* Priority */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-destructive/15 flex items-center justify-center">
                  <AlertTriangle size={16} className="text-destructive" />
                </div>
                <p className="flex-1 text-sm font-medium text-foreground">Priority</p>
                <div className="flex gap-1">
                  {PRIORITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setPriority(opt.value)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                        priority === opt.value
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Photo */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Photo</p>
            <MediaPicker
              imageUrl={(item as any).image_url || null}
              preview={imgPreview}
              onFileSelect={(file, url) => { setImgFile(file); setImgPreview(url); }}
              onClear={() => { setImgFile(null); setImgPreview(""); }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              className="flex-1 h-12 rounded-2xl bg-foreground text-background text-sm font-semibold shadow-soft"
            >
              Save Changes
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="h-12 px-5 rounded-2xl bg-destructive/10 text-destructive text-sm font-semibold border border-destructive/20 flex items-center gap-2"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ItemRow({
  item,
  onToggle,
  onMove,
  onEdit,
  isFirst,
  isLast,
}: {
  item: GroceryRow;
  onToggle: (id: string, checked: boolean) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onEdit: (item: GroceryRow) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
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
      <span
        onClick={() => { if (!item.is_checked) onEdit(item); }}
        className={`flex-1 text-sm font-medium cursor-pointer ${item.is_checked ? "line-through text-muted-foreground" : "text-foreground"}`}
      >
        {item.name}
      </span>
      {!item.is_checked && (
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => onMove(item.id, "up")}
            disabled={isFirst}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
              isFirst ? "text-muted-foreground/30" : "text-muted-foreground hover:bg-muted active:bg-primary/10"
            }`}
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={() => onMove(item.id, "down")}
            disabled={isLast}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
              isLast ? "text-muted-foreground/30" : "text-muted-foreground hover:bg-muted active:bg-primary/10"
            }`}
          >
            <ChevronDown size={14} />
          </button>
        </div>
      )}
    </motion.div>
  );
}
