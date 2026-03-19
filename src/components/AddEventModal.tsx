import { useState } from "react";
import { X, Trash2, Bell, Timer, CalendarDays, Cake } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { toast } from "sonner";
import { MediaPicker, uploadAttachment } from "@/components/MediaPicker";
import { useAppMode } from "@/hooks/useAppMode";

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
  const { isSingle } = useAppMode();

  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formCategory, setFormCategory] = useState("date-night");
  const [formAssigned, setFormAssigned] = useState("both");
  const [formPriority, setFormPriority] = useState("medium");
  const [formDate, setFormDate] = useState("");
  const [formReminder, setFormReminder] = useState("none");
  const [formCountdown, setFormCountdown] = useState("none");
  const [formType, setFormType] = useState<"event" | "reminder" | "countdown" | "birthday">("event");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formFilePreview, setFormFilePreview] = useState("");

  // Reset form when modal opens
  const resetForAdd = () => {
    setFormTitle("");
    setFormDesc("");
    setFormTime(defaultTime || "");
    setFormCategory("date-night");
    setFormAssigned("both");
    setFormPriority("medium");
    setFormDate(format(defaultDate || new Date(), "yyyy-MM-dd"));
    setFormReminder("none");
    setFormCountdown("none");
    setFormType("event");
    setFormFile(null);
    setFormFilePreview("");
  };

  const resetForEdit = (event: CalendarEventData) => {
    setFormTitle(event.title);
    setFormDesc(event.description || "");
    setFormTime(event.event_time || "");
    setFormCategory(event.category);
    setFormAssigned(event.assigned_to);
    setFormPriority(event.priority);
    setFormDate(event.event_date);
    setFormReminder(event.reminder || "none");
    setFormCountdown(event.countdown_type || "none");
    // Infer type from stored data
    if (event.countdown_type === "days-until" || event.countdown_type === "days-since") setFormType("countdown");
    else if (event.category === "birthday") setFormType("birthday");
    else if (event.reminder && event.reminder !== "none") setFormType("reminder");
    else setFormType("event");
  };

  // Use a ref-like pattern: reset when open changes
  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) {
    if (editingEvent) resetForEdit(editingEvent);
    else resetForAdd();
  }
  if (open !== lastOpen) setLastOpen(open);

  const { canAccess } = useSubscriptionContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !partnerPair || !formTitle.trim()) return;

    // Free tier: cap at 10 calendar events
    if (!editingEvent && !canAccess("unlimited-calendar")) {
      const { count } = await supabase
        .from("calendar_events")
        .select("id", { count: "exact", head: true })
        .eq("partner_pair", partnerPair);
      if ((count ?? 0) >= 10) {
        toast.error("Free plan limited to 10 events. Upgrade to Pro for unlimited!");
        return;
      }
    }

    let imageUrl: string | null = null;
    if (formFile) {
      imageUrl = await uploadAttachment(formFile, user.id);
      if (!imageUrl) { toast.error("Upload failed"); return; }
    }

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
          reminder: formReminder,
          countdown_type: formCountdown,
          ...(imageUrl ? { image_url: imageUrl } : {}),
        } as any)
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
          reminder: formReminder,
          countdown_type: formCountdown,
          recurrence: "once",
          user_id: user.id,
          partner_pair: partnerPair,
          image_url: imageUrl,
        } as any)
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
          className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/30"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) onClose();
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card w-full max-w-lg rounded-t-3xl shadow-elevated max-h-[72vh] flex flex-col overflow-hidden"
          >
            <div className="shrink-0 bg-card px-5 pt-4 pb-0">
              {/* Swipe handle */}
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted cursor-grab active:cursor-grabbing" />
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-foreground">
                  {editingEvent ? "Edit" : "New"}
                </h3>
                <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors">
                  <X size={16} className="text-muted-foreground" />
                </button>
              </div>
              {/* Type tabs */}
              <div className="flex gap-1 rounded-2xl bg-muted p-1">
                {([
                  { value: "event" as const, label: "Event", icon: CalendarDays },
                  { value: "reminder" as const, label: "Reminder", icon: Bell },
                  { value: "countdown" as const, label: "Countdown", icon: Timer },
                  { value: "birthday" as const, label: "Birthday", icon: Cake },
                ]).map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => {
                      setFormType(tab.value);
                      if (tab.value === "reminder") { setFormReminder("15min"); setFormCountdown("none"); }
                      else if (tab.value === "countdown") { setFormCountdown("days-until"); setFormReminder("none"); }
                      else if (tab.value === "birthday") { setFormCategory("birthday"); setFormCountdown("days-until"); setFormReminder("1day"); }
                      else { setFormReminder("none"); setFormCountdown("none"); }
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-semibold transition-colors ${
                      formType === tab.value
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    <tab.icon size={13} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                <div className="space-y-3 pb-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                      {formType === "birthday" ? "Whose Birthday" : formType === "reminder" ? "Remind me to..." : formType === "countdown" ? "What are you counting?" : "Title"}
                    </label>
                    <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required
                      placeholder={formType === "birthday" ? "e.g. Sarah's Birthday" : formType === "reminder" ? "e.g. Buy flowers" : formType === "countdown" ? "e.g. Our Anniversary" : "Event title"}
                      className="h-11 w-full rounded-xl border border-border bg-muted px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  {/* Description - show for event and countdown only */}
                  {(formType === "event" || formType === "countdown") && (
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground">Description</label>
                      <input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Optional"
                        className="h-11 w-full rounded-xl border border-border bg-muted px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                  )}
                  <div className={formType === "reminder" ? "" : "grid grid-cols-2 gap-3"}>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                        {formType === "birthday" ? "Birthday Date" : formType === "countdown" ? "Target Date" : "Date"}
                      </label>
                      <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} required
                        className="h-11 w-full rounded-xl border border-border bg-muted px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    {/* Time - show for event and reminder only */}
                    {(formType === "event" || formType === "reminder") && (
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Time</label>
                        <input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)}
                          className="h-11 w-full rounded-xl border border-border bg-muted px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                    )}
                  </div>
                  {/* Category - event only */}
                  {formType === "event" && (
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
                  )}
                  {/* Assign & Priority - event only */}
                  {formType === "event" && (
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
                  )}
                  {/* Reminder options - shown for reminder & birthday types */}
                  {(formType === "reminder" || formType === "birthday") && (
                    <div>
                      <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <Bell size={12} /> Remind me
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: "at-time", label: "At time" },
                          { value: "5min", label: "5 min before" },
                          { value: "15min", label: "15 min" },
                          { value: "1hour", label: "1 hour" },
                          { value: "1day", label: "1 day" },
                        ].map((r) => (
                          <button key={r.value} type="button" onClick={() => setFormReminder(r.value)}
                            className={`rounded-btn px-3 py-1.5 text-xs font-medium transition-colors ${
                              formReminder === r.value ? "love-gradient text-primary-foreground" : "bg-muted text-muted-foreground"
                            }`}>
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Countdown options - shown for countdown & birthday types */}
                  {(formType === "countdown" || formType === "birthday") && (
                    <div>
                      <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <Timer size={12} /> Countdown
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: "days-until", label: "Days until" },
                          { value: "days-since", label: "Days since" },
                        ].map((c) => (
                          <button key={c.value} type="button" onClick={() => setFormCountdown(c.value)}
                            className={`rounded-btn px-3 py-1.5 text-xs font-medium transition-colors ${
                              formCountdown === c.value ? "love-gradient text-primary-foreground" : "bg-muted text-muted-foreground"
                            }`}>
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Photo attachment */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Photo (optional)</label>
                    <MediaPicker
                      imageUrl={null}
                      preview={formFilePreview}
                      onFileSelect={(file, url) => { setFormFile(file); setFormFilePreview(url); }}
                      onClear={() => { setFormFile(null); setFormFilePreview(""); }}
                    />
                  </div>
                </div>
              </div>
              <div className="shrink-0 border-t border-border bg-card px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
                <div className="space-y-2">
                  <button type="submit" className="h-12 w-full rounded-btn love-gradient text-sm font-semibold text-primary-foreground shadow-soft">
                    {editingEvent ? "Save Changes" : formType === "reminder" ? "Add Reminder" : formType === "countdown" ? "Add Countdown" : formType === "birthday" ? "Add Birthday" : "Add Event"}
                  </button>
                  {editingEvent && (
                    <button type="button" onClick={handleDelete}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-btn bg-destructive/10 text-sm font-semibold text-destructive">
                      <Trash2 size={14} /> Delete {formType === "reminder" ? "Reminder" : formType === "countdown" ? "Countdown" : formType === "birthday" ? "Birthday" : "Event"}
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
