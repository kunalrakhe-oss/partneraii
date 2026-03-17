import { useState } from "react";
import { Menu } from "lucide-react";
import ProfileDrawer from "@/components/ProfileDrawer";

export default function ProfileButton({ className = "" }: { className?: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setDrawerOpen(true)}
        className={`w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 ${className}`}
      >
        <Menu size={18} className="text-foreground" />
      </button>
      <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
