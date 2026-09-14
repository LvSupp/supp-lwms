import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type ScannerProps = {
  open: boolean;
  titre: string;
  onClose: () => void;
  onResult: (valeur: string) => void;
};

/** Lecteur QR code / code-barres utilisant la caméra du téléphone. */
export function ScannerDialog({ open, titre, onClose, onResult }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    let controls: { stop: () => void } | undefined;
    const reader = new BrowserMultiFormatReader();

    const start = async () => {
      try {
        controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current ?? undefined,
          (result) => {
            if (result && !stopped) {
              stopped = true;
              controls?.stop();
              onResult(result.getText().trim());
            }
          },
        );
      } catch {
        setErreur(
          "Impossible d'accéder à la caméra. Autorisez l'accès dans votre navigateur ou saisissez le code à la main.",
        );
      }
    };
    void start();

    return () => {
      stopped = true;
      controls?.stop();
    };
  }, [open, onResult]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <ScanLine className="size-5 shrink-0 text-primary" />
          <h2 className="truncate font-display text-xl uppercase tracking-wide">{titre}</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fermer le scanner">
          <X className="size-5" />
        </Button>
      </div>

      <div className="relative flex-1 overflow-hidden bg-black">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-56 w-56 rounded-xl border-2 border-primary/80 shadow-[0_0_0_9999px_oklch(0_0_0/0.45)]" />
        </div>
      </div>

      <div className="space-y-3 px-4 py-5 pb-8">
        <p className="text-center text-sm text-muted-foreground">
          {erreur ?? "Placez le QR code ou le code-barres dans le cadre."}
        </p>
        <Button variant="secondary" className="h-14 w-full text-base" onClick={onClose}>
          Annuler
        </Button>
      </div>
    </div>
  );
}

/** Gros bouton tactile déclenchant le scanner. */
export function BoutonScanner({ onClick, label = "Scanner" }: { onClick: () => void; label?: string }) {
  return (
    <Button onClick={onClick} className="h-14 w-full gap-2 text-base font-semibold">
      <ScanLine className="size-5" />
      {label}
    </Button>
  );
}
