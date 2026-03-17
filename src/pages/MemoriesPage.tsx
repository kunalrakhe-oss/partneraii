import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, Camera, Heart, Star, Calendar, X, Image as ImageIcon, Award, BookOpen, Loader2, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProfileButton from "@/components/ProfileButton";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { useToast } from "@/hooks/use-toast";
import PageTransition from "@/components/PageTransition";
import { format, parseISO } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type MemoryRow = Tables<"memories">;

const MILESTONE_OPTIONS = [
  { label: "Anniversary", emoji: "💍" },
  { label: "First Date", emoji: "🌹" },
  { label: "First Trip", emoji: "✈️" },
  { label: "Moved In", emoji: "🏡" },
  { label: "First Kiss", emoji: "💋" },
  { label: "Got Engaged", emoji: "💎" },
  { label: "Custom", emoji: "⭐" },
];

type FilterType = "all" | "photo" | "milestone" | "note";
type MemoryType = "photo" | "milestone" | "note";

export default function MemoriesPage() {
  const { partnerPair, loading: pairLoading, userId } = usePartnerPair();
  const { toast } = useToast();
  const [memories, setMemories] = useState<MemoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formType, setFormType] = useState<MemoryType>("photo");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formPreview, setFormPreview] = useState("");
  const [formMilestone, setFormMilestone] = useState("");

  const fetchMemories = useCallback(async () => {
    if (!partnerPair) return;
    const { data } = await supabase
      .from("memories")
      .select("*")
      .eq("partner_pair", partnerPair)
      .order("memory_date", { ascending: false });
    if (data) setMemories(data);
    setLoading(false);
  }, [partnerPair]);

  useEffect(() => {
    if (pairLoading) return;
    if (!partnerPair) { setLoading(false); return; }
    fetchMemories();
  }, [partnerPair, pairLoading, fetchMemories]);

  // Realtime
  useEffect(() => {
    if (!partnerPair) return;
    const channel = supabase
      .channel("memories-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "memories" }, () => {
        fetchMemories();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [partnerPair, fetchMemories]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Photo must be under 10MB", variant: "destructive" });
      return;
    }
    setFormFile(file);
    setFormPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    if (!userId) return null;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("memory-photos")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return null;
    }
    const { data: urlData } = supabase.storage.from("memory-photos").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleAdd = async () => {
    if (!formTitle.trim() || !userId || !partnerPair) return;
    setSubmitting(true);

    let photoUrl: string | null = null;
    if (formFile) {
      photoUrl = await uploadPhoto(formFile);
      if (!photoUrl && formFile) { setSubmitting(false); return; }
    }

    const { error } = await supabase.from("memories").insert({
      title: formTitle.trim(),
      description: formDesc.trim() || null,
      memory_date: formDate,
      type: formType,
      photo_url: photoUrl,
      user_id: userId,
      partner_pair: partnerPair,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      resetForm();
      setShowAdd(false);
      fetchMemories();
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setFormTitle("");
    setFormDesc("");
    setFormDate(format(new Date(), "yyyy-MM-dd"));
    setFormType("photo");
    setFormFile(null);
    setFormPreview("");
    setFormMilestone("");
  };

  const deleteMemory = async (id: string) => {
    await supabase.from("memories").delete().eq("id", id);
    fetchMemories();
  };

  const filtered = memories.filter(m => filter === "all" || m.type === filter);

  // Group by year-month
  const grouped: Record<string, MemoryRow[]> = {};
  filtered.forEach(m => {
    const key = format(parseISO(m.memory_date), "MMMM yyyy");
    (grouped[key] = grouped[key] || []).push(m);
  });

  if (pairLoading || loading) {
    return (
      <PageTransition>
        <div className="px-5 pt-10 pb-6 flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </PageTransition>
    );
  }

  if (!partnerPair) {
    return (
      <PageTransition>
        <div className="px-5 pt-10 pb-6 text-center">
          <p className="text-4xl mb-3">🔗</p>
          <p className="text-sm text-muted-foreground">Connect with your partner to start sharing memories</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="px-5 pt-10 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Memories</h1>
            <p className="text-xs text-muted-foreground">Your love story, one moment at a time 💕</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="w-10 h-10 rounded-full love-gradient flex items-center justify-center shadow-soft"
          >
            <Plus size={18} className="text-primary-foreground" />
          </button>
        </div>

        {/* Stats banner */}
        <div className="bg-[hsl(100,20%,72%)] rounded-2xl p-4 mt-5 mb-5 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-foreground/70">Total Memories</p>
            <p className="text-base font-bold text-foreground">{memories.length} moments captured</p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{memories.filter(m => m.type === "photo").length}</p>
              <p className="text-[10px] text-foreground/70">Photos</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{memories.filter(m => m.type === "milestone").length}</p>
              <p className="text-[10px] text-foreground/70">Milestones</p>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {([
            { key: "all", label: "All", icon: BookOpen },
            { key: "photo", label: "Photos", icon: Camera },
            { key: "milestone", label: "Milestones", icon: Award },
            { key: "note", label: "Notes", icon: Star },
          ] as { key: FilterType; label: string; icon: any }[]).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                filter === f.key
                  ? "bg-[hsl(100,20%,72%)] text-foreground"
                  : "bg-card shadow-card text-muted-foreground border border-border"
              }`}
            >
              <f.icon size={12} />
              {f.label}
            </button>
          ))}
        </div>

        {/* Timeline */}
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Heart size={28} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">No memories yet</p>
            <p className="text-xs text-muted-foreground mb-4">Start capturing your love story</p>
            <button
              onClick={() => setShowAdd(true)}
              className="px-5 py-2.5 rounded-full bg-foreground text-background text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Plus size={14} /> Add First Memory
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([monthYear, monthMemories]) => (
              <div key={monthYear}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <h2 className="text-sm font-bold text-foreground">{monthYear}</h2>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="space-y-3 pl-4 border-l-2 border-border ml-0.5">
                  {monthMemories.map(memory => (
                    <motion.div
                      key={memory.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-card rounded-2xl shadow-card border border-border overflow-hidden relative"
                    >
                      {memory.photo_url && (
                        <div className="h-44 overflow-hidden">
                          <img src={memory.photo_url} alt={memory.title} className="w-full h-full object-cover" />
                        </div>
                      )}

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            {memory.type === "milestone" && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-2">
                                ⭐ Milestone
                              </span>
                            )}
                            {memory.type === "photo" && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full mb-2">
                                📷 Photo
                              </span>
                            )}
                            {memory.type === "note" && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full mb-2">
                                ✏️ Note
                              </span>
                            )}
                            <p className="text-sm font-bold text-foreground">{memory.title}</p>
                            {memory.description && (
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{memory.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => deleteMemory(memory.id)}
                            className="text-muted-foreground hover:text-destructive shrink-0 mt-1"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-2.5">
                          <Calendar size={10} className="text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">
                            {format(parseISO(memory.memory_date), "EEEE, MMMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FAB */}
        {memories.length > 0 && (
          <div className="flex justify-end mt-6">
            <button
              onClick={() => setShowAdd(true)}
              className="bg-foreground text-background px-5 py-3 rounded-full flex items-center gap-2 shadow-elevated text-sm font-semibold"
            >
              <Plus size={16} /> Add Memory
            </button>
          </div>
        )}

        {/* Add Memory Modal */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/30"
              onClick={() => { setShowAdd(false); resetForm(); }}
            >
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                drag="y"
                dragConstraints={{ top: 0 }}
                dragElastic={0.2}
                onDragEnd={(_e: any, info: any) => {
                  if (info.offset.y > 100 || info.velocity.y > 500) { setShowAdd(false); resetForm(); }
                }}
                onClick={e => e.stopPropagation()}
                className="bg-card w-full max-w-lg rounded-t-3xl shadow-elevated max-h-[72vh] flex flex-col"
              >
                <div className="shrink-0 px-5 pt-4 pb-2">
                  <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-muted cursor-grab active:cursor-grabbing" />
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-foreground">New Memory</h3>
                    <button onClick={() => { setShowAdd(false); resetForm(); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors">
                      <X size={16} className="text-muted-foreground" />
                    </button>
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 p-5 pt-2 pb-10">

                {/* Type selector */}
                <div className="flex gap-2 mb-4">
                  {([
                    { key: "photo" as MemoryType, label: "Photo", icon: Camera },
                    { key: "milestone" as MemoryType, label: "Milestone", icon: Award },
                    { key: "note" as MemoryType, label: "Note", icon: Star },
                  ]).map(t => (
                    <button
                      key={t.key}
                      onClick={() => setFormType(t.key)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                        formType === t.key
                          ? "bg-[hsl(100,20%,72%)] text-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <t.icon size={14} />
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Photo upload */}
                {(formType === "photo" || formType === "milestone") && (
                  <div className="mb-4">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    {formPreview ? (
                      <div className="relative rounded-xl overflow-hidden h-40">
                        <img src={formPreview} alt="Upload preview" className="w-full h-full object-cover" />
                        <button
                          onClick={() => { setFormFile(null); setFormPreview(""); }}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-foreground/60 flex items-center justify-center"
                        >
                          <X size={14} className="text-background" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="w-full h-32 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                      >
                        <ImageIcon size={24} />
                        <span className="text-xs font-medium">Tap to add a photo</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Milestone picker */}
                {formType === "milestone" && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-foreground mb-2">Milestone Type</p>
                    <div className="flex flex-wrap gap-2">
                      {MILESTONE_OPTIONS.map(ms => (
                        <button
                          key={ms.label}
                          onClick={() => setFormMilestone(ms.label)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            formMilestone === ms.label
                              ? "bg-primary/15 text-primary ring-1 ring-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {ms.emoji} {ms.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Title */}
                <input
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Give this memory a title"
                  className="w-full h-11 px-4 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary mb-3"
                />

                {/* Description */}
                <textarea
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="What made this moment special?"
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none mb-3"
                />

                {/* Date */}
                <div className="flex items-center gap-2 mb-4">
                  <Calendar size={14} className="text-muted-foreground" />
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="h-11 px-4 rounded-xl bg-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary flex-1"
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={handleAdd}
                  disabled={!formTitle.trim() || submitting}
                  className="w-full h-12 rounded-xl love-gradient text-primary-foreground font-semibold text-sm shadow-soft disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : "Save Memory"}
                </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
