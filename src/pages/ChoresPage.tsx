import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocalStorage, generateId, type Chore } from "@/lib/store";
import PageTransition from "@/components/PageTransition";

const DEFAULT_CHORES: Partial<Chore>[] = [
  { name: "Laundry", instructions: ["Separate colors from whites", "Add detergent to drum", "Select Normal wash cycle", "Dry on Medium Heat"], frequency: "weekly" },
  { name: "Dishes", instructions: ["Rinse dishes", "Load dishwasher", "Add detergent tab", "Run on Normal cycle"], frequency: "daily" },
  { name: "Vacuum", instructions: ["Clear floor of small items", "Vacuum all rooms", "Empty vacuum bin"], frequency: "weekly" },
  { name: "Take out trash", instructions: ["Collect all trash bags", "Replace liners", "Take to bins outside"], frequency: "daily" },
];

export default function ChoresPage() {
  const [chores, setChores] = useLocalStorage<Chore[]>("lovelist-chores", []);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addChore = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newChore: Chore = {
      id: generateId(),
      name: fd.get("name") as string,
      instructions: (fd.get("instructions") as string).split("\n").filter(Boolean),
      frequency: fd.get("frequency") as Chore["frequency"],
      assignedTo: fd.get("assignedTo") as Chore["assignedTo"],
      completed: false,
    };
    setChores([...chores, newChore]);
    setShowAdd(false);
  };

  const toggleComplete = (id: string) => {
    setChores(chores.map(c => c.id === id ? { ...c, completed: !c.completed, lastCompleted: new Date().toISOString() } : c));
  };

  const deleteChore = (id: string) => {
    setChores(chores.filter(c => c.id !== id));
  };

  const addDefaults = () => {
    const newChores = DEFAULT_CHORES.map(c => ({
      ...c,
      id: generateId(),
      assignedTo: "rotating" as const,
      completed: false,
    })) as Chore[];
    setChores([...chores, ...newChores]);
  };

  return (
    <PageTransition>
      <div className="px-5 pt-10 pb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-foreground">Chores</h1>
          <button onClick={() => setShowAdd(true)} className="w-9 h-9 rounded-full love-gradient flex items-center justify-center shadow-soft">
            <Plus size={18} className="text-primary-foreground" />
          </button>
        </div>

        {chores.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🧹</p>
            <p className="text-sm text-muted-foreground mb-3">No chores yet</p>
            <button onClick={addDefaults} className="text-sm text-primary font-medium">Add default chores →</button>
          </div>
        ) : (
          <div className="space-y-2">
            {chores.map(chore => (
              <motion.div key={chore.id} layout className="bg-card rounded-xl shadow-card overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <button onClick={() => toggleComplete(chore.id)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      chore.completed ? "bg-success border-success" : "border-border"
                    }`}
                  >
                    {chore.completed && <span className="text-success-foreground text-xs">✓</span>}
                  </button>
                  <div className="flex-1 min-w-0" onClick={() => setExpandedId(expandedId === chore.id ? null : chore.id)}>
                    <p className={`text-sm font-medium ${chore.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{chore.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{chore.frequency} · {chore.assignedTo}</p>
                  </div>
                  <button onClick={() => setExpandedId(expandedId === chore.id ? null : chore.id)}>
                    {expandedId === chore.id ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                  </button>
                  <button onClick={() => deleteChore(chore.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 size={14} />
                  </button>
                </div>
                <AnimatePresence>
                  {expandedId === chore.id && chore.instructions.length > 0 && (
                    <motion.div
                      initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 pt-1 border-t border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Instructions</p>
                        <ol className="space-y-1">
                          {chore.instructions.map((step, i) => (
                            <li key={i} className="text-xs text-foreground flex gap-2">
                              <span className="text-primary font-semibold">{i + 1}.</span> {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}

        {/* Add Chore Modal */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/30 z-50 flex items-end justify-center"
              onClick={() => setShowAdd(false)}
            >
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
                className="bg-card w-full max-w-lg rounded-t-2xl p-5 shadow-elevated"
              >
                <h3 className="text-lg font-bold text-foreground mb-4">New Chore</h3>
                <form onSubmit={addChore} className="space-y-3">
                  <input name="name" required placeholder="Chore name" className="w-full h-10 px-3 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  <textarea name="instructions" placeholder="Instructions (one per line)" rows={3} className="w-full px-3 py-2 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                  <div className="grid grid-cols-2 gap-3">
                    <select name="frequency" className="h-10 px-3 rounded-lg bg-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="once">One-time</option>
                    </select>
                    <select name="assignedTo" className="h-10 px-3 rounded-lg bg-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="rotating">Rotating</option>
                      <option value="partner1">Me</option>
                      <option value="partner2">Partner</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full h-11 rounded-xl love-gradient text-primary-foreground font-semibold text-sm shadow-soft">
                    Add Chore
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
