import { StateMessage } from "@/components/ui/state-message";

export default function Loading() {
  return (
    <div className="grid h-dvh place-items-center">
      <StateMessage kind="loading" title="Cargando estaciones…" />
    </div>
  );
}
