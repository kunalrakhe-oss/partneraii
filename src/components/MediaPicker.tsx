import { useState, useRef } from "react";
import { Image as ImageIcon, X, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MediaPickerProps {
  imageUrl: string | null;
  preview: string;
  onFileSelect: (file: File, previewUrl: string) => void;
  onClear: () => void;
  compact?: boolean;
}

export function MediaPicker({ imageUrl, preview, onFileSelect, onClear, compact = false }: MediaPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const displayUrl = preview || imageUrl;

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB", variant: "destructive" });
      return;
    }
    onFileSelect(file, URL.createObjectURL(file));
  };

  if (displayUrl) {
    return (
      <div className={`relative rounded-xl overflow-hidden ${compact ? "h-24 w-24" : "h-36 w-full"}`}>
        <img src={displayUrl} alt="Attachment" className="w-full h-full object-cover" />
        <button
          type="button"
          onClick={onClear}
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-foreground/60 flex items-center justify-center"
        >
          <X size={12} className="text-background" />
        </button>
      </div>
    );
  }

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleSelect} className="hidden" />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className={`rounded-xl border-2 border-dashed border-border flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors ${
          compact ? "w-24 h-24" : "w-full h-28"
        }`}
      >
        <Camera size={compact ? 16 : 20} />
        {!compact && <span className="text-xs font-medium">Add photo</span>}
      </button>
    </>
  );
}

export async function uploadAttachment(file: File, userId: string): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("attachments")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) return null;
  const { data } = supabase.storage.from("attachments").getPublicUrl(path);
  return data.publicUrl;
}
