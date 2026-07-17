# CORRECTIF.md — Le mode hors-ligne ne fonctionne pas

**Statut** : correctif prioritaire · **Version** 1.0 du 17/07/2026
**À exécuter APRÈS** U1–U3 et l'étape 13 : le précache doit couvrir le CSS et les écrans définitifs. Corriger avant serait à refaire.
**Symptôme** : l'app installée sur l'écran d'accueil **exige toujours la connexion**. En mode avion, elle ne démarre pas.
**Gravité** : 🔴 **bloquant absolu** — contrainte C1. Une app de pointage qui exige internet dans une salle sans réseau ne sert à rien le 4 août.
**Portée autorisée** : `sw.js`, `manifest.webmanifest`, `index.html` (`<head>` + enregistrement du SW), `assets/logos.js`. **RIEN d'autre.**

---

## 0. Règles du correctif

1. **Diagnostiquer AVANT de corriger.** Sept causes possibles, chacune avec sa preuve. Interdiction de modifier du code avant d'avoir identifié laquelle, preuve à l'appui.
2. **Une cause à la fois.** Prouver → corriger → re-tester le protocole du §3 → ensuite seulement la suivante.
3. Ne touche à **aucune logique** (`js/model/`, `js/db/`, `js/scan/`, `js/ui/`). Le hors-ligne est une affaire de cache, pas de métier.
4. `print.css` reste intouchable (INTERFACE.md §2).
5. Si le diagnostic révèle une cause hors des sept : **documente-la, propose, attends validation.**

---

## 1. Pourquoi une PWA marche hors-ligne — ou pas

Trois conditions, TOUTES nécessaires :

```
1. Un service worker ENREGISTRÉ et ACTIVÉ          (sw.js pris en compte)
2. Un précache COMPLET                              (chaque fichier de l'app en cache)
3. Un fetch handler CACHE-FIRST qui répond à TOUT   (aucune requête ne dépend du réseau)
```

Si l'app « exige la connexion », au moins une des trois a échoué. Le symptôme est identique dans tous les cas — c'est pourquoi on diagnostique au lieu de deviner.

---

## 2. Les 7 causes, leurs preuves, leurs correctifs

### Cause 1 — Le service worker n'est jamais enregistré

**Preuve** : DevTools → Application → Service Workers → *vide*. Ou console :
`navigator.serviceWorker.getRegistrations().then(r => console.log(r.length))` → `0`.

**Origines fréquentes** :
- l'appel `register('sw.js')` absent d'`index.html`, ou placé dans un module qui plante avant de l'atteindre ;
- chemin faux : `register('/sw.js')` alors que l'app est servie sous un sous-chemin (GitHub Pages !) → 404 silencieux ;
- l'enregistrement dans un `type="module"` qui échoue pour une autre raison.

**Correctif** :
```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')      // ./ RELATIF, jamais /sw.js
      .then(r => console.log('[SW] enregistré, scope:', r.scope))
      .catch(e => console.error('[SW] ÉCHEC:', e));  // un échec doit se VOIR
  }
</script>
```
Script **classique, inline, en fin de `<body>`** — pas dans un module qui peut échouer en amont.

### Cause 2 — Le précache échoue (et l'installation avec)

**LA cause la plus probable dans ce projet.** `cache.addAll()` est tout-ou-rien : **un seul fichier introuvable = tout le précache échoue = le SW ne s'installe jamais.** L'app semble marcher en ligne (le réseau compense) et meurt en avion. La refonte UI (U1–U3) a renommé/ajouté des fichiers : si `ASSETS` n'a pas suivi, c'est ici que ça casse.

**Preuve** : Application → Service Workers → état bloqué à *trying to install* ou *redundant*. Console : `Failed to execute 'addAll'` avec l'URL coupable. Ou : Cache Storage → **compter les entrées** ≠ nombre de fichiers de l'app.

**Origines fréquentes** :
- un fichier listé dans `ASSETS` qui n'existe plus (renommé pendant la refonte) ;
- un chemin absolu `/js/main.js` au lieu de `./js/main.js` ;
- un fichier oublié dans `ASSETS` → il chargera du réseau → cause 3 ;
- une icône référencée par le manifest mais absente du disque.

**Correctif** — `ASSETS` exhaustive et **vérifiée contre le disque** :
```js
const CACHE = 'bim-v2';            // ← INCRÉMENTÉ à chaque déploiement
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png',
  './css/app.css', './css/print.css',
  './js/main.js', './js/config.js', './js/data.js',
  './js/model/norm.js', './js/model/ident.js', './js/model/slots.js',
  './js/model/lattice.js', './js/model/report.js',
  './js/db/store.js', './js/db/backup.js',
  './js/scan/camera.js', './js/scan/decode.js', './js/scan/debounce.js',
  './js/scan/pipeline.js',
  './js/ui/screen-scan.js', './js/ui/screen-list.js',
  './js/ui/screen-report.js', './js/ui/screen-setup.js',
  './js/feedback.js', './js/badges.js',
  './vendor/jsqr.js', './vendor/qrcode.js',
  './assets/logos.js',
];
// ⚠️ Liste d'EXEMPLE d'après SPECIFICATIONS.md §2. La vérité est sur le disque :
//   find . -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' \
//     -o -name '*.png' -o -name '*.webmanifest' \) | grep -v test/ | grep -v spike/
// Comparer LIGNE À LIGNE avec ASSETS. Tout écart, dans les deux sens, est un bug.
```
**Tous les chemins en `./` relatif.** Jamais `/js/...`.

### Cause 3 — Un fichier non précaché est requis au démarrage

**Preuve** : en mode avion, DevTools → Network → une requête en rouge (failed). Son URL est le coupable.

**Origines fréquentes** :
- un `import` ajouté pendant la refonte sans mise à jour d'`ASSETS` ;
- une image ou police référencée dans le CSS ;
- **un CDN résiduel** (`<script src="https://...">`, `@import url(...)`, police d'icônes distante) — violation de l'Invariant 9.2 : à supprimer/vendorer, pas à cacher.

**Correctif** : ajouter le fichier à `ASSETS` (s'il est local), vendorer ou supprimer la ressource distante. Vérifier :
```bash
grep -rn "https://" index.html css/ js/ | grep -v "^Binary"
# Seule sortie tolérée : des commentaires. Toute URL chargée au runtime est un bug.
```

### Cause 4 — Le fetch handler laisse passer des requêtes

**Preuve** : SW activé, cache complet, et le mode avion échoue quand même. Network → colonne Size : les fichiers ne disent pas *(ServiceWorker)*.

**Origines fréquentes** :
- stratégie network-first ou stale-while-revalidate au lieu de cache-first strict ;
- le handler ignore les navigations (`mode: 'navigate'`) → l'index lui-même part au réseau ;
- mismatch d'URL : la page demandée est `./` mais le cache contient `./index.html`, et `caches.match` ne fait pas le lien.

**Correctif** — cache-first strict + repli de navigation :
```js
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(r => {
      if (r) return r;
      if (e.request.mode === 'navigate') return caches.match('./index.html');
      return fetch(e.request);   // ne devrait jamais arriver pour une ressource de l'app
    })
  );
});
```

### Cause 5 — Un vieux service worker tient la place

**Preuve** : Application → Service Workers → un SW *waiting* à côté de l'actif, ou l'app sert une version qui ne correspond pas au code déployé.

**Correctif** : `skipWaiting` + `clients.claim` + purge des vieux caches :
```js
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
```
Côté opérateur : désinstaller l'icône, Safari → Effacer historique et données de site, réinstaller. **Tester sur un état propre — sinon on teste le cache d'hier.**

### Cause 6 — Testé dans le mauvais contexte

**Preuve** : ça marche sur `localhost` mais jamais testé installé, ou testé en `http://192.168.x.x`.

**Rappels** :
- un SW ne s'enregistre qu'en `https:` ou `localhost` — jamais en `http://192.168.x.x` (le spike du 16/07 l'a montré pour la caméra : même règle) ;
- sur iOS, installer depuis **Safari, onglet NORMAL** — en navigation privée le SW ne s'enregistre pas ;
- ré-ajouter l'icône **après** la fin de l'installation du SW : ouvrir l'app en ligne, attendre 10 s, vérifier le cache, PUIS couper le réseau.

### Cause 7 — Le manifest empêche le mode standalone

**Preuve** : l'icône ouvre un onglet Safari avec barre d'adresse, au lieu d'une app plein écran.

**Origines** : `start_url` incohérent avec le scope réel, manifest non servi, balises iOS absentes.

**Correctif** — `manifest.webmanifest` :
```json
{
  "name": "Pointage BIM — GREEN INNOVATIVE'S",
  "short_name": "Pointage BIM",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#14532d",
  "icons": [
    { "src": "./icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "./icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "./icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
Et dans `<head>` (iOS ignore en partie le manifest) :
```html
<link rel="manifest" href="./manifest.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="apple-touch-icon" href="./icon-192.png">
```

---

## 3. Protocole de validation — le seul verdict qui compte

Validé seulement si **TOUT** passe, dans l'ordre, sur un état propre :

```
 1. Désinstaller l'icône. Safari → Effacer les données du site.
 2. Déployer la nouvelle version (CACHE incrémenté).
 3. Ouvrir l'URL HTTPS dans Safari (onglet NORMAL).
 4. Console/DevTools distants : SW "activated". Cache Storage :
    nombre d'entrées = nombre de fichiers ASSETS. Égalité stricte.
 5. Ajouter à l'écran d'accueil. Fermer Safari.
 6. Lancer DEPUIS L'ICÔNE → plein écran, pas de barre d'adresse.
 7. Utiliser l'app 30 s (scan d'un badge de test, ouvrir la Liste).
 8. ✈️ MODE AVION. Tuer l'app (swipe). Relancer depuis l'icône.
 9. → L'app démarre, la Liste s'affiche, un scan fonctionne.
10. Toujours en avion : Rapport → impression → l'aperçu se génère.
11. Sortir du mode avion. Relancer. Tout fonctionne encore.
```

**L'étape 9 est le verdict.** Tout le reste est de l'instrumentation.

Sur ordinateur : DevTools → Network → *Offline* → recharger. Utile pour itérer vite, **mais ne remplace pas le téléphone** — iOS a ses propres comportements de SW.

---

## 4. Livrable

À consigner dans `ETAT.md` :

```markdown
## Correctif hors-ligne — [date]
- Cause(s) identifiée(s) : n° X — [preuve : message console / capture]
- Fichiers modifiés : [liste]
- CACHE incrémenté : bim-vN → bim-vN+1
- Protocole §3 : passé intégralement sur [iPhone modèle] le [date]
- Entrées en cache : N (= N fichiers ASSETS)
```

Et à la Definition of done du projet :
- [ ] Protocole §3 passé sur l'iPhone **et** sur un Android
- [ ] `ASSETS` vérifié contre `find` — zéro écart
- [ ] `grep https://` → aucune ressource runtime
