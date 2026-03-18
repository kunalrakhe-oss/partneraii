import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

const DISMISS_KEY = "lovelist-cleanup-dismissed";
const THRESHOLD = 10;
const REASK_DAYS = 7;

export default function CompletedTasksCleanup() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check if dismissed recently
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const diff = Date.now() - parseInt(dismissed, 10);
      if (diff < REASK_DAYS * 86400000) return;
    }

    const check = async () => {
      const [choresRes, eventsRes] = await Promise.all([
        supabase
          .from("chores")
          .select("id", { count: "exact", head: true })
          .eq("is_completed", true),
        supabase
          .from("calendar_events")
          .select("id", { count: "exact", head: true })
          .eq("is_completed", true),
      ]);

      const total = (choresRes.count ?? 0) + (eventsRes.count ?? 0);
      if (total >= THRESHOLD) {
        setCount(total);
        setOpen(true);
      }
    };

    // Delay so it doesn't block initial load
    const timer = setTimeout(check, 5000);
    return () => clearTimeout(timer);
  }, [user]);

  const handleDelete = async () => {
    setDeleting(true);
    await Promise.all([
      supabase.from("chores").delete().eq("is_completed", true),
      supabase.from("calendar_events").delete().eq("is_completed", true),
    ]);
    setDeleting(false);
    setOpen(false);
    toast({ title: "Cleaned up!", description: `${count} completed tasks deleted.` });
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="rounded-2xl max-w-sm mx-auto">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Trash2 size={20} className="text-destructive" />
            </div>
            <AlertDialogTitle className="text-base">Clean up completed tasks?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm">
            You have <strong>{count}</strong> completed tasks. Delete them to free up space and keep things tidy?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDismiss}>Keep them</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? "Deleting…" : "Delete all completed"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
