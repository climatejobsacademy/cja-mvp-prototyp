// SR-50/51/52 (SCORM-Architektur, 2026-09-16): Beantwortet Fetch-Requests fuer
// entpackte SCORM-Paket-Dateien unter /scorm-assets/<lessonId>/... direkt aus
// einer In-Memory-Map, die die Seite per postMessage befuellt hat. Grund fuer
// diesen Ansatz statt Blob-URL-Umschreibung: mehrseitige Pakete mit relativen
// CSS/JS/Bild-Referenzen funktionieren so unveraendert, weil der Browser
// relative URLs ganz normal gegen die Dokument-URL aufloest.
//
// Bewusste Prototyp-Einschraenkung: Die Map lebt nur im Service-Worker-Prozess
// und ist nach SW-Neustart (Browser-Idle) leer. Fuer die kurzen Pilot-Module
// (10-15 Min, eine Sitzung) ausreichend.

const packages = new Map(); // packageId -> Map(relativerPfad -> { data: ArrayBuffer, mimeType: string })

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg || msg.type !== "REGISTER_PACKAGE") return;

  const fileMap = new Map();
  for (const file of msg.files) {
    fileMap.set(file.path, { data: file.data, mimeType: file.mimeType });
  }
  packages.set(msg.packageId, fileMap);

  if (event.ports && event.ports[0]) {
    event.ports[0].postMessage({ type: "PACKAGE_REGISTERED", packageId: msg.packageId });
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const match = url.pathname.match(/^\/scorm-assets\/([^/]+)\/(.+)$/);
  if (!match) return;

  const [, packageId, relativePfad] = match;
  const fileMap = packages.get(packageId);
  const file = fileMap ? fileMap.get(decodeURIComponent(relativePfad)) : null;

  if (!file) {
    event.respondWith(new Response("Nicht gefunden im SCORM-Paket.", { status: 404 }));
    return;
  }

  event.respondWith(
    new Response(file.data, {
      status: 200,
      headers: { "Content-Type": file.mimeType },
    })
  );
});
