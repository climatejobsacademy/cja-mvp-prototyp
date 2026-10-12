// Eigenes Profilfoto der lernenden Person -- VORLÄUFIG, nur Demo (Anna
// 2026-10-12): bleibt nur in diesem Browser (localStorage), nichts geht an den
// Server. Für dev bräuchte es Storage, ein Feld an person und Zugriffsregeln.
// Das Bild wird vor dem Speichern auf 256 px verkleinert.

const SCHLUESSEL = "cja-demo:eigenes-foto";
const EREIGNIS = "cja-demo-eigenes-foto";

export function fotoLesen(): string | null {
  try {
    return window.localStorage.getItem(SCHLUESSEL);
  } catch {
    return null;
  }
}

export function fotoAbonnieren(neu: () => void): () => void {
  window.addEventListener(EREIGNIS, neu);
  window.addEventListener("storage", neu);
  return () => {
    window.removeEventListener(EREIGNIS, neu);
    window.removeEventListener("storage", neu);
  };
}

function melden() {
  window.dispatchEvent(new Event(EREIGNIS));
}

/** Datei verkleinern (quadratisch zugeschnitten) und im Browser speichern. */
export async function fotoSpeichern(datei: File): Promise<boolean> {
  const url = URL.createObjectURL(datei);
  try {
    const bild = await new Promise<HTMLImageElement>((ok, fehler) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = fehler;
      img.src = url;
    });
    const groesse = 256;
    const seite = Math.min(bild.width, bild.height);
    const leinwand = document.createElement("canvas");
    leinwand.width = groesse;
    leinwand.height = groesse;
    leinwand
      .getContext("2d")
      ?.drawImage(bild, (bild.width - seite) / 2, (bild.height - seite) / 2, seite, seite, 0, 0, groesse, groesse);
    window.localStorage.setItem(SCHLUESSEL, leinwand.toDataURL("image/jpeg", 0.85));
    melden();
    return true;
  } catch {
    return false;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function fotoEntfernen() {
  try {
    window.localStorage.removeItem(SCHLUESSEL);
  } catch {
    // Speicher gesperrt: nichts zu tun.
  }
  melden();
}
