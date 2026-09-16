import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { Printer, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { definirDemandeEtiquette, type TypeEtiquette } from "@/lib/preferences";

/** QR Code encodant uniquement l'identifiant fourni. */
export function CodeQr({ valeur, taille = 220 }: { valeur: string; taille?: number }) {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let annule = false;
    void QRCode.toString(valeur, {
      type: "svg",
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    }).then((code) => {
      if (!annule) setSvg(code);
    });
    return () => {
      annule = true;
    };
  }, [valeur]);

  return (
    <div
      style={{ width: taille, height: taille }}
      className="bg-white"
      aria-label={`QR Code ${valeur}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/** Étiquette simple : QR Code + identifiant lisible. */
export function Etiquette({ valeur, taille = 220 }: { valeur: string; taille?: number }) {
  return (
    <div className="etiquette flex flex-col items-center gap-3 rounded-lg border border-black bg-white p-5">
      <CodeQr valeur={valeur} taille={taille} />
      <p className="text-center font-display text-3xl font-bold uppercase tracking-wide text-black">
        {valeur}
      </p>
    </div>
  );
}

/** Rend les étiquettes dans une zone visible uniquement à l'impression. */
function ZoneImpression({ valeurs }: { valeurs: string[] }) {
  const [pret, setPret] = useState(false);
  useEffect(() => setPret(true), []);
  if (!pret) return null;
  return createPortal(
    <div className="zone-impression">
      {valeurs.map((v) => (
        <div key={v} className="etiquette-page">
          <Etiquette valeur={v} taille={280} />
        </div>
      ))}
    </div>,
    document.body,
  );
}

/** Aperçu d'une ou plusieurs étiquettes, avec impression navigateur. */
export function DialogEtiquette({
  open,
  onClose,
  valeurs,
  titre = "Étiquette QR Code",
}: {
  open: boolean;
  onClose: () => void;
  valeurs: string[];
  titre?: string;
}) {
  return (
    <>
      {open && valeurs.length > 0 && <ZoneImpression valeurs={valeurs} />}
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{titre}</DialogTitle>
            <DialogDescription>
              {valeurs.length > 1
                ? `${valeurs.length} étiquettes prêtes à imprimer.`
                : "Étiquette prête à imprimer."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {valeurs.map((v) => (
              <Etiquette key={v} valeur={v} />
            ))}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="secondary" className="h-12" onClick={onClose}>
              Fermer
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="h-12 gap-2 text-base font-semibold"
                    onClick={() => window.print()}
                  >
                    <Printer className="size-5" />
                    Imprimer
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Imprimer l'étiquette</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Proposition d'impression juste après une création réussie. */
export function DialogPropositionEtiquette({
  open,
  type,
  valeur,
  onClose,
}: {
  open: boolean;
  type: TypeEtiquette;
  valeur: string;
  onClose: () => void;
}) {
  const [nePlusDemander, setNePlusDemander] = useState(false);
  const [apercu, setApercu] = useState(false);

  const fermer = () => {
    definirDemandeEtiquette(type, !nePlusDemander);
    setNePlusDemander(false);
    onClose();
  };

  return (
    <>
      <Dialog open={open && !apercu} onOpenChange={(o) => !o && fermer()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {type === "palette" ? "Palette" : "Emplacement"} {valeur} créé avec succès.
            </DialogTitle>
            <DialogDescription>Souhaitez-vous générer son étiquette QR Code ?</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3">
            <Checkbox
              id={`ne-plus-demander-${type}`}
              checked={nePlusDemander}
              onCheckedChange={(v) => setNePlusDemander(v === true)}
            />
            <Label htmlFor={`ne-plus-demander-${type}`} className="text-sm text-muted-foreground">
              Ne plus demander
            </Label>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="secondary" className="h-12" onClick={fermer}>
              Plus tard
            </Button>
            <Button
              className="h-12 gap-2 text-base font-semibold"
              onClick={() => {
                definirDemandeEtiquette(type, !nePlusDemander);
                setApercu(true);
              }}
            >
              <QrCode className="size-5" />
              Générer l'étiquette
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DialogEtiquette
        open={apercu}
        valeurs={[valeur]}
        onClose={() => {
          setApercu(false);
          setNePlusDemander(false);
          onClose();
        }}
      />
    </>
  );
}

/** Bouton discret d'accès à l'étiquette. */
export function BoutonEtiquette({
  onClick,
  label = "Générer / afficher l'étiquette",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={label} onClick={onClick}>
            <Printer className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
