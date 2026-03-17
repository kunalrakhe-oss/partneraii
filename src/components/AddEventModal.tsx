import { useState } from "react";
import { X, Trash2, Bell, Timer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { toast } from "sonner";

const CATEGORIES = ["date-night", "groceries", "cleaning", "bills", "travel", "family"] as const;
const CATEGORY_LABEL: Record<string, string> = {
  "date-night": "Romance", groceries: "Household", cleaning: "Cleaning",
  bills: "Bills", travel: "Travel", family: "Family",
};

export interface CalendarEventData {
  id: string;
  title: string;
  description: string | null;
  category: string;
  event_date: string;
  event_time: string | null;
  assigned_to: string;
  priority: string;
  recurrence: string;
  is_completed: boolean;
  user_id: string;
  partner_pair: string;
  reminder?: string;
  countdown_type?: string;
}

interface AddEventModalProps {
  open: boolean;
  onClose: () => void;
  editingEvent?: CalendarEventData | null;
  defaultDate?: Date;
  defaultTime?: string;
  onEventSaved?: (event: CalendarEventData) => void;
  onEventDeleted?: (id: string) => void;
}

export default function AddEventModal({
  open,
  onClose,
  editingEvent = null,
  defaultDate,
  defaultTime,
  onEventSaved,
  onEventDeleted,
}: AddEventModalProps) {
  const { user } = useAuth();
  const { partnerPair } = usePartnerPair();

  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formCategory, setFormCategory] = useState("date-night");
  const [formAssigned, setFormAssigned] = useState("both");
  const [formPriority, setFormPriority] = useState("medium");
  const [formDate, setFormDate] = useState("");
  const [formReminder, setFormReminder] = useState("none");
  const [formCountdown, setFormCountdown] = useState("none");

  // Reset form when modal opens
  const resetForAdd = () => {
    setFormTitle("");
    setFormDesc("");
    setFormTime(defaultTime || "");
    setFormCategory("date-night");
    setFormAssigned("both");
    setFormPriority("medium");
    setFormDate(format(defaultDate || new Date(), "yyyy-MM-dd"));
  };

  const resetForEdit = (event: CalendarEventData) => {
    setFormTitle(event.title);
    setFormDesc(event.description || "");
    setFormTime(event.event_time || "");
    setFormCategory(event.category);
    setFormAssigned(event.assigned_to);
    setFormPriority(event.priority);
    setFormDate(event.event_date);
  };

  // Use a ref-like pattern: reset when open changes
  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) {
    if (editingEvent) resetForEdit(editingEvent);
    else resetForAdd();
  }
  if (open !== lastOpen) setLastOpen(open);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !partnerPair || !formTitle.trim()) return;

    if (editingEvent) {
      const { data, error } = await supabase
        .from("calendar_events")
        .update({
          title: formTitle.trim(),
          description: formDesc.trim() || null,
          event_time: formTime || null,
          category: formCategory,
          assigned_to: formAssigned,
          priority: formPriority,
          event_date: formDate,
        })
        .eq("id", editingEvent.id)
        .select()
        .single();
      if (error) { toast.error("Failed to update event"); return; }
      onEventSaved?.(data);
      toast.success("Event updated ✨");
    } else {
      const { data, error } = await supabase
        .from("calendar_events")
        .insert({
          title: formTitle.trim(),
          description: formDesc.trim() || null,
          category: formCategory,
          event_date: formDate,
          event_time: formTime || null,
          assigned_to: formAssigned,
          priority: formPriority,
          recurrence: "once",
          user_id: user.id,
          partner_pair: partnerPair,
        })
        .select()
        .single();
      if (error) { toast.error("Failed to add event"); return; }
      onEventSaved?.(data);
      toast.success("Event added 🎉");
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!editingEvent) return;
    const { error } = await supabase.from("calendar_events").delete().eq("id", editingEvent.id);
    if (error) { toast.error("Failed to delete"); return; }
    onEventDeleted?.(editingEvent.id);
    toast.success("Event removed");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/30 pb-20 sm:pb-0"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card w-full max-w-lg rounded-t-3xl shadow-elevated h-[85vh] max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="shrink-0 border-b border-border bg-card px-5 pt-4 pb-3">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">
                  {editingEvent ? "Edit Event" : "New Event"}
                </h3>
                <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <X size={16} className="text-muted-foreground" />
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                <div className="space-y-3 pb-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Title</label>
                    <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required placeholder="Event title"
                      className="h-11 w-full rounded-xl border border-border bg-muted px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Description</label>
                    <input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Optional"
                      className="h-11 w-full rounded-xl border border-border bg-muted px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground">Date</label>
                      <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} required
                        className="h-11 w-full rounded-xl border border-border bg-muted px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground">Time</label>
                      <input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)}
                        className="h-11 w-full rounded-xl border border-border bg-muted px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Category</label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((c) => (
                        <button key={c} type="button" onClick={() => setFormCategory(c)}
                          className={`rounded-btn px-3 py-1.5 text-xs font-medium transition-colors ${
                            formCategory === c ? "love-gradient text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}>
                          {CATEGORY_LABEL[c]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground">Assign</label>
                      <select value={formAssigned} onChange={(e) => setFormAssigned(e.target.value)}
                        className="h-11 w-full rounded-xl border border-border bg-muted px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                        <option value="both">Both</option>
                        <option value="me">Me</option>
                        <option value="partner">Partner</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground">Priority</label>
                      <select value={formPriority} onChange={(e) => setFormPriority(e.target.value)}
                        className="h-11 w-full rounded-xl border border-border bg-muted px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="shrink-0 border-t border-border bg-card px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
                <div className="space-y-2">
                  <button type="submit" className="h-12 w-full rounded-btn love-gradient text-sm font-semibold text-primary-foreground shadow-soft">
                    {editingEvent ? "Save Changes" : "Add Event"}
                  </button>
                  {editingEvent && (
                    <button type="button" onClick={handleDelete}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-btn bg-destructive/10 text-sm font-semibold text-destructive">
                      <Trash2 size={14} /> Delete Event
                    </button>
                  )}
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
