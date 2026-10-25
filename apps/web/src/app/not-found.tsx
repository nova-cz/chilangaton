import { buttonClasses } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <StateMessage
        kind="empty"
        title="Esta pantalla aún no existe"
        description="Puede que otra línea del equipo la esté construyendo."
        action={
          <Link href="/app" className={buttonClasses("dark")}>
            Ir a la app
          </Link>
        }
      />
    </main>
  );
}
