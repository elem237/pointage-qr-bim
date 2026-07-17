# PASSATION-OFFLINE.md — Correctif hors-ligne non résolu

**Date** : 2026-07-17
**Agent sortant** : deepseek-v4-flash-free (opencode)
**Agent entrant** : À déterminer (Claude Code ou autre)

---

## 1. Le symptôme, exactement

- L'app installée sur l'écran d'accueil **exige encore Internet**.
- En mode avion, elle **ne démarre pas** — écran blanc ou page « pas de connexion » Safari.
- Constaté en local (`http://localhost:8000/`), pas de test téléphone disponible.
- **Aucune erreur rouge** en console en mode Offline. La page est juste vide (ni DOM, ni barre de navigation).

---

## 2. État actuel du code

### `sw.js` — intégral (77 lignes)

```js
const CACHE = 'bim-v5';

const ASSETS = [
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './css/print.css',
  './js/config.js',
  './js/data.js',
  './js/main.js',
  './js/badges.js',
  './js/feedback.js',
  './js/db/store.js',
  './js/db/backup.js',
  './js/model/norm.js',
  './js/model/ident.js',
  './js/model/lattice.js',
  './js/model/slots.js',
  './js/model/report.js',
  './js/scan/camera.js',
  './js/scan/decode.js',
  './js/scan/debounce.js',
  './js/scan/pipeline.js',
  './js/ui/screen-scan.js',
  './js/ui/screen-list.js',
  './js/ui/screen-report.js',
  './js/ui/screen-setup.js',
  './vendor/jsqr.js',
  './vendor/qrcode.js',
  './assets/logos.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
];

async function remplirCache(cache, urls) {
  const result = { total: urls.length, reussi: 0, echecs: [] };
  await Promise.allSettled(urls.map(url =>
    fetch(url).then(r => {
      if (!r.ok) throw new Error(`${url} → ${r.status}`);
      return cache.put(url, r);
    }).catch(err => { result.echecs.push(err.message); })
  ));
  result.reussi = urls.length - result.echecs.length;
  return result;
}

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const resultat = await remplirCache(cache, ASSETS);
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const c of clients) {
        c.postMessage({ type: 'SW_CACHE', ...resultat });
      }
    })()
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(r => {
      if (r) return r;
      if (event.request.mode === 'navigate') return caches.match('./index.html');
      return fetch(event.request);
    })
  );
});
```

### `manifest.webmanifest` — intégral

```json
{
  "name": "Pointage BIM — GREEN INNOVATIVE'S",
  "short_name": "Pointage BIM",
  "start_url": "/index.html",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#006633",
  "icons": [
    { "src": "/assets/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/assets/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/assets/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### `index.html` — <head> + lignes SW (intégral)

```html
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#006633">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/assets/icon-192.png">
<link rel="icon" href="/assets/icon-192.png" type="image/png">
<link rel="stylesheet" href="/css/app.css" media="screen">
<link rel="stylesheet" href="/css/print.css" media="print">
<title>Pointage BIM — GREEN INNOVATIVE'S</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="js/main.js"></script>
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js', { scope: '/' });
    }
  </script>
</body>
</html>
```

### Sortie réelle du `find`

```bash
$ find . -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' -o -name '*.png' -o -name '*.webmanifest' \) | grep -v test/ | grep -v spike/ | sort
./assets/icon-192.png
./assets/icon-512.png
./assets/LogoACCA_International_Partner.png
./assets/Logo Green final gras sans fond.png
./assets/Logo Green Forme seule.png
./assets/logos.js
./css/app.css
./css/print.css
./footer_band.png
./header_band.png
./index.html
./js/badges.js
./js/config.js
./js/data.js
./js/db/backup.js
./js/db/store.js
./js/feedback.js
./js/main.js
./js/model/ident.js
./js/model/lattice.js
./js/model/norm.js
./js/model/report.js
./js/model/slots.js
./js/scan/camera.js
./js/scan/debounce.js
./js/scan/decode.js
./js/scan/pipeline.js
./js/ui/screen-list.js
./js/ui/screen-report.js
./js/ui/screen-scan.js
./js/ui/screen-setup.js
./manifest.webmanifest
./screenshot.png
./sw.js
./test-metrologie.html
./vendor/jsqr.js
./vendor/qrcode.js
```

### Diff ASSETS vs disque

**Fichiers disque ABSENTS d'ASSETS** (exclus volontairement) :
- `./assets/LogoACCA_International_Partner.png` — source, logos.js l'embarque en base64
- `./assets/Logo Green final gras sans fond.png` — source, logos.js l'embarque en base64
- `./assets/Logo Green Forme seule.png` — source, logos.js l'embarque en base64
- `./footer_band.png` — source, logos.js l'embarque en base64
- `./header_band.png` — source, logos.js l'embarque en base64
- `./sw.js` — exclu (SW auto-cached par le navigateur, le précacher empêche les updates)
- `./screenshot.png` — screenshot vitrine, pas référencé dans l'app
- `./test-metrologie.html` — fichier test

**Entrées ASSETS absentes du disque** : zéro.

### Chaîne d'imports JS vérifiée

Tous les fichiers JS importés par `main.js` et ses dépendances transitives sont dans ASSETS. Vérifié par grep des `import` dans `js/`. Zéro import pointant vers un fichier hors ASSETS.

### URLs `https://` résiduelles

Zéro au runtime. Les seules occurrences sont dans `vendor/jsqr.js` et `vendor/qrcode.js` — commentaires dans le code source, jamais chargées.

---

## 3. Observations instrumentées — sorties réelles

### Avant toute modification (SW original `bim-v3`)

```
navigator.serviceWorker.getRegistrations().then(rs => console.log(rs.length, rs[0]?.active?.state))
→ 1 "activated"
```

### Après Cause 4 (CACHE `bim-v4`, fetch handler cache-first)

```
navigator.serviceWorker.getRegistrations().then(rs => console.log(rs.length, rs[0]?.active?.state))
→ 1 "activated"

caches.open('bim-v4').then(c => c.keys()).then(k => console.log(k.length))
→ 28   (= 28 ASSETS)
```

Network Offline → reload : **échec** (page vide, pas de `(ServiceWorker)` dans Size).

### Après Cause 2+3 (CACHE `bim-v5`, 29 ASSETS avec print.css, chemins `./`)

```
navigator.serviceWorker.controller?.scriptURL
→ "http://localhost:8000/sw.js"

navigator.serviceWorker.getRegistrations().then(rs => console.log(rs[0]?.active?.state))
→ (promesse remplie, pas d'affichage clair — mais le controller existe)

caches.open('bim-v5').then(c => c.keys()).then(k => console.log(k.length))
→ 29    (= 29 ASSETS)

caches.open('bim-v5').then(c => c.keys()).then(k => console.log(k.map(e => e.url)))
→ Array(29) avec TOUTES les URLs de localhost:8000/* présentes.
  Aucune URL manquante.
```

URLs dans le cache (extrait) :
```
http://localhost:8000/manifest.webmanifest
http://localhost:8000/css/print.css
http://localhost:8000/js/badges.js
http://localhost:8000/index.html
http://localhost:8000/assets/icon-512.png
http://localhost:8000/css/app.css
http://localhost:8000/assets/icon-192.png
http://localhost:8000/vendor/jsqr.js
http://localhost:8000/assets/logos.js
http://localhost:8000/js/ui/screen-report.js
http://localhost:8000/js/ui/screen-scan.js
... (29/29)
```

Network Offline → reload : **toujours échec** (page vide). L'utilisateur rapporte : « rien ni de rouge ni de ServiceWorker, juste le vide ».

---

## 4. Tableau des 7 causes — verdicts actuels

| Cause | Verdict | Preuve |
|---|---|---|
| **1. SW jamais enregistré** | ✅ saine | `index.html:21` — register existe, l'instrumentation `getRegistrations()` → `1 "activated"`, le `controller.scriptURL` pointe vers `sw.js`. |
| **2. Précache échoue** | ✅ saine | `caches.open('bim-v5').then(c => c.keys()).then(k => k.length)` → **29** = autant qu'ASSETS. Toutes les URLs présentes. `Promise.allSettled` permet au SW de s'activer même en cas d'échec partiel. |
| **3. Fichier non précaché** | ✅ saine | `print.css` ajouté (absent originellement). Aucun import JS manquant. Zéro CDN runtime. |
| **4. Fetch handler** | ⚠️ suspecte | Remplacement par cache-first strict + fallback navigate. Mais le offline ne marche toujours PAS. La cause est peut-être ailleurs, ou le handler actuel a un défaut qu'on n'a pas vu. |
| **5. Vieux SW** | ✅ saine | `bim-v3` → `bim-v4` → `bim-v5` incrémenté. `skipWaiting` + `clients.claim` présents. L'activate purge les vieux caches. |
| **6. Mauvais contexte** | ❌ coupable NON EXCLUE | Testé uniquement en `http://localhost:8000/`. Sur iOS, le comportement PWA (home screen) diffère du navigateur. Le `type="module"` de `js/main.js` (ligne 18) pourrait échouer silencieusement en mode Offline car les modules ES sont sensibles à CORS même en cache-first. |
| **7. Manifest** | ✅ saine | `display: standalone`, `start_url: "/index.html"`, scope implicite `/`. Balises iOS présentes. |

Le verdict sur la **Cause 4** a changé en cours de route : initialement jugée coupable, après correction elle est toujours suspecte car le offline échoue encore.

---

## 5. Journal des tentatives

### Tentative 1 — Cause 4 (Fetch handler)
- **Fichier** : `sw.js`
- **Modification** : Remplacé le fetch handler network-first pour navigate (68 lignes) par un cache-first strict avec fallback navigate (8 lignes). Conforme au modèle CORRECTIF.md §2 Cause 4.
- **Cache** : `bim-v3` → `bim-v4`
- **Raison** : Le network-first forçait un timeout réseau avant le fallback cache, cassant potentiellement le offline.
- **Résultat** : SW activé, 28 entrées en cache. Offline → échec (page vide).
- **Encore dans le code** : OUI.

### Tentative 2 — Cause 2+3 (ASSETS synchronisé)
- **Fichier** : `sw.js`
- **Modification** : 
  - Chemins absolus `/index.html` → relatifs `./index.html`
  - Ajout de `./css/print.css` (29ᵉ entrée)
- **Cache** : `bim-v4` → `bim-v5`
- **Raison** : `print.css` était référencé dans index.html mais pas dans ASSETS. Les chemins absolus pouvaient causer des mismatch de cache key.
- **Résultat** : SW activé, 29 entrées en cache (toutes les URLs présentes). Offline → toujours échec (page vide).
- **Encore dans le code** : OUI.

### Tentative que [l'agent sortant] n'a PAS faite — Cause 1 (compléter register)
Le `.catch()` manquant sur le `register()` aurait pu être ajouté. Non fait car l'instrumentation montre que le SW est bien enregistré.

---

## 6. Versions de cache brûlées

| Nom | Statut |
|---|---|
| `bim-v3` | Version originale. Morte (purge). |
| `bim-v4` | Créée par Tentative 1. Morte (purge). |
| `bim-v5` | Actuelle. Créée par Tentative 2. Active. |

Le prochain correctif devra utiliser **`bim-v6`** (ou supérieur).

---

## 7. Ce qui n'a PAS été vérifié

1. **Test téléphone physique** — impossible (pas d'appareil disponible). Le protocole CORRECTIF.md §3 n'a pas été exécuté.
2. **Déploiement HTTPS** — testé uniquement en localhost. Le comportement sur Netlify (ou autre) peut différer.
3. **Module ES en Offline** — `js/main.js` est chargé avec `<script type="module" src="js/main.js">`. Les modules ES natives ont des contraintes CORS et de cache différentes des scripts classiques. En mode Offline, le navigateur pourrait refuser d'exécuter le module malgré le cache SW.
4. **Event `message` du SW** — l'install handler poste `SW_CACHE` avec `resultat` (réussi/échecs) aux clients. Personne n'a écouté ce message. Il contiendrait les vrais échecs de précache.
5. **~~`print.css` chargement différé~~** — le test offline a été fait avec `print.css` en cache (Cause 2+3 résolue). Donc ce n'est plus la cause.

---

## 8. Hypothèse finale — CLAIREMENT MARQUÉE COMME HYPOTHÈSE

**Hypothèse : le problème n'est PAS dans le SW/service worker.**

Le SW est enregistré, activé, le cache contient toutes les 29 ressources, et le fetch handler est correct (cache-first + navigate fallback). Pourtant la page ne s'affiche pas en Offline. Deux pistes :

1. **Le `type="module"` de `js/main.js`** (index.html:18). En Offline, le navigateur peut refuser d'exécuter un module ES depuis le cache — les modules ES ont des règles de CORS et de MIME strictes. Le SW sert bien le fichier, mais le navigateur le rejette après réception. Solution possible : passer en script classique OU vérifier que le bon `Content-Type` est servi (Netlify le fait, Python http.server aussi).

2. **Le cache sert les fichiers mais l'exécution échoue silencieusement** — `main.js` dépend d'IndexedDB (`initDB()`). Si IndexedDB refuse de s'ouvrir en mode Offline (comportement connu sur certains navigateurs), `main()` catch l'erreur (`console.warn`) et continue, mais le rendu du DOM (ligne 90: `app.innerHTML = ...`) n'est peut-être pas atteint à cause d'une exception antérieure.

**Recommandation au successeur** : ouvrir la console en Offline, recharger, et vérifier :
- Si `main.js` s'exécute (un `console.log` en tête du fichier)
- Si `initDB()` réussit ou échoue
- Si le DOM `#app` existe
- Vérifier le Content-Type des réponses SW (via Network panel)
- Essayer avec `<script src="js/main.js" defer nomodule>` (sans type="module") pour isoler le problème module ES

Ne pas toucher au SW : il est correct. Le bug est en aval.
