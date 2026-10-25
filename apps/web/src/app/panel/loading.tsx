import { Skeleton } from "@/components/ui/state-message";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy>
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
