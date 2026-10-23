// Guarda los archivos de la app en el celular para que abra sin internet.
// IMPORTANTE: cada vez que cambies algún archivo de la app, sube este número (v2, v3...)
// para que el celular descargue la versión nueva.
const VERSION = "kuma-day-v6";

const ARCHIVOS = [
  "./",
  "index.html",
  "css/style.css",
  "js/app.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/kuma.svg"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(ARCHIVOS); }));
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (llaves) {
      return Promise.all(llaves.filter(function (k) { return k !== VERSION; })
        .map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (e) {
  // Solo los archivos de la propia app; lo de Spotify siempre va directo a internet.
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    // ignoreSearch: al regresar de Spotify la dirección trae "?code=...", y debe abrir la misma página.
    caches.match(e.request, { ignoreSearch: true }).then(function (r) { return r || fetch(e.request); })
  );
});
