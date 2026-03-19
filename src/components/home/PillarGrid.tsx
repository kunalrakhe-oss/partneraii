import FeatureBubbles from "@/components/FeatureBubbles";

interface PillarGridProps {
  isSingle: boolean;
  uncheckedGroceries: number;
  pendingChores: number;
  totalEvents: number;
}

export default function PillarGrid({ isSingle, uncheckedGroceries, pendingChores, totalEvents }: PillarGridProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-foreground px-1">Life Pillars</p>
      <FeatureBubbles
        isSingle={isSingle}
        uncheckedGroceries={uncheckedGroceries}
        pendingChores={pendingChores}
        totalEvents={totalEvents}
      />
    </div>
  );
}
