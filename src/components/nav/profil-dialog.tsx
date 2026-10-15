"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Trash2 } from "lucide-react";

import { profilfotoEntfernen, profilfotoSpeichern, rufnameSpeichern, type ProfilErgebnis } from "@/app/(learner)/profil-actions";
import { PersonAvatar } from "@/components/person-avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  FOTO_ANNEHMEN,
  FOTO_EINGABE_MAX_BYTES,
  FOTO_KANTE_PX,
  FOTO_MAX_BYTES,
  mittigerAusschnitt,
} from "@/lib/profilfoto";

const FOKUS = "outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";

/** Bild laden (HEIC nur in Safari), Orientierung übernimmt der Browser. */
function bildLaden(datei: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(datei);
  return new Promise<HTMLImageElement>((ok, fehler) => {
    const bild = new Image();
    bild.onload = () => ok(bild);
    bild.onerror = fehler;
    bild.src = url;
  }).finally(() => URL.revokeObjectURL(url));
}

function alsJpeg(leinwand: HTMLCanvasElement, qualitaet: number): Promise<Blob | null> {
  return new Promise((ok) => leinwand.toBlob(ok, "image/jpeg", qualitaet));
}

/** Mittig quadratisch zuschneiden, auf 512 px verkleinern, als JPEG (SR-77). */
async function zuschneiden(datei: File): Promise<Blob | null> {
  const bild = await bildLaden(datei);
  const { x, y, kante } = mittigerAusschnitt(bild.naturalWidth, bild.naturalHeight);
  const leinwand = document.createElement("canvas");
  leinwand.width = FOTO_KANTE_PX;
  leinwand.height = FOTO_KANTE_PX;
  leinwand.getContext("2d")?.drawImage(bild, x, y, kante, kante, 0, 0, FOTO_KANTE_PX, FOTO_KANTE_PX);
  const jpeg = await alsJpeg(leinwand, 0.85);
  if (jpeg && jpeg.size <= FOTO_MAX_BYTES) return jpeg;
  return alsJpeg(leinwand, 0.7);
}

/**
 * Profil im Konto-Menü (SR-77; Rufname SR-48/SR-73): Profilfoto hochladen,
 * ändern, entfernen und Rufname ändern. Das Foto wird im Browser zugeschnitten
 * und verkleinert; gespeichert wird es im privaten Bucket profilfotos.
 * Sichtbar für die Person selbst, ihre Trainer:innen und AfCJ admin.
 */
export function ProfilDialog({
  offen,
  onOffenChange,
  name,
  rufname,
  fotoUrl,
}: {
  offen: boolean;
  onOffenChange: (offen: boolean) => void;
  name: string;
  rufname: string;
  fotoUrl: string | null;
}) {
  const eingabe = useRef<HTMLInputElement>(null);
  const [entwurf, setEntwurf] = useState(rufname);
  const [meldung, setMeldung] = useState<{ text: string; fehler: boolean } | null>(null);
  const [laeuft, startTransition] = useTransition();

  function melden(ergebnis: ProfilErgebnis, erfolg: string) {
    setMeldung(ergebnis.ok ? { text: erfolg, fehler: false } : { text: ergebnis.fehler, fehler: true });
  }

  function fotoGewaehlt(datei: File) {
    setMeldung(null);
    if (datei.size > FOTO_EINGABE_MAX_BYTES) {
      setMeldung({ text: "Die Datei ist zu groß (höchstens 10 MB).", fehler: true });
      return;
    }
    startTransition(async () => {
      let jpeg: Blob | null = null;
      try {
        jpeg = await zuschneiden(datei);
      } catch {
        jpeg = null;
      }
      if (!jpeg) {
        setMeldung({ text: "Dieses Bild kann dein Browser nicht öffnen. Bitte wähle ein JPEG- oder PNG-Foto.", fehler: true });
        return;
      }
      const daten = new FormData();
      daten.append("foto", new File([jpeg], "profilfoto.jpg", { type: "image/jpeg" }));
      melden(await profilfotoSpeichern(daten), "Profilfoto gespeichert.");
    });
  }

  return (
    <Dialog
      open={offen}
      onOpenChange={(neu) => {
        if (neu) {
          setEntwurf(rufname);
          setMeldung(null);
        }
        onOffenChange(neu);
      }}
    >
      <DialogContent className="gap-5">
        <DialogHeader>
          <DialogTitle className="text-ink">Profil bearbeiten</DialogTitle>
          <DialogDescription>
            Dein Foto sehen du, die anderen Lernenden deiner Kohorte und das Team der Akademie.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4">
          <PersonAvatar
            name={rufname || name}
            fotoUrl={fotoUrl}
            className="size-16"
            fallbackClassName="bg-muted text-xl text-ink"
          />
          <div className="flex flex-col items-start gap-1">
            <input
              ref={eingabe}
              type="file"
              accept={FOTO_ANNEHMEN}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                const datei = e.target.files?.[0];
                e.target.value = "";
                if (datei) fotoGewaehlt(datei);
              }}
            />
            <Button variant="outline" disabled={laeuft} onClick={() => eingabe.current?.click()}>
              <Camera data-icon="inline-start" aria-hidden="true" />
              {fotoUrl ? "Foto ändern" : "Foto hinzufügen"}
            </Button>
            {fotoUrl && (
              <Button
                variant="ghost"
                disabled={laeuft}
                onClick={() => {
                  setMeldung(null);
                  startTransition(async () => melden(await profilfotoEntfernen(), "Profilfoto entfernt."));
                }}
              >
                <Trash2 data-icon="inline-start" aria-hidden="true" />
                Foto entfernen
              </Button>
            )}
            <span className="text-xs text-muted-foreground">JPEG, PNG, WebP oder HEIC, quadratisch zugeschnitten</span>
          </div>
        </div>
        {/* Der Upload ist die Freigabe (SR-30, Entscheidung 2026-10-14): klar sagen, wer das Foto sieht. */}
        <p className="rounded-lg bg-subtle px-3 py-2.5 text-sm text-ink">
          Mit dem Hochladen bist du einverstanden, dass dein Foto für Mitglieder deiner Kohorte sichtbar ist. Du kannst
          es jederzeit entfernen.
        </p>

        <form
          className="flex flex-col gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            setMeldung(null);
            startTransition(async () => melden(await rufnameSpeichern(entwurf), "Rufname gespeichert."));
          }}
        >
          <label htmlFor="rufname" className="text-sm font-medium text-ink">
            Rufname
          </label>
          <div className="flex gap-2">
            <input
              id="rufname"
              name="rufname"
              value={entwurf}
              maxLength={60}
              required
              autoComplete="given-name"
              onChange={(e) => setEntwurf(e.target.value)}
              className={`h-11 min-w-0 flex-1 rounded-lg border border-border bg-white px-3 text-[15px] text-ink ${FOKUS}`}
            />
            <Button type="submit" className="h-11" disabled={laeuft || entwurf.trim() === rufname.trim()}>
              Speichern
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">So begrüßt dich die Plattform.</span>
        </form>

        <p
          role={meldung?.fehler ? "alert" : "status"}
          className={meldung?.fehler ? "text-sm text-destructive" : "text-sm text-ink"}
        >
          {laeuft ? "Wird gespeichert …" : (meldung?.text ?? "")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
