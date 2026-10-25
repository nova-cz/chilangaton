"use client";

import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <StateMessage
        kind="error"
        title="Algo salió mal"
        description="No pudimos mostrar esta pantalla. Intenta de nuevo."
        action={
          <Button variant="dark" onClick={reset}>
            Reintentar
          </Button>
        }
      />
    </main>
  );
}
