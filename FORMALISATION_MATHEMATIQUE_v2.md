# Formalisation mathématique — Système de pointage par QR

**Projet** : Initiation au processus BIM dans la gestion des projets immobiliers
**Organisation** : GREEN INNOVATIVE'S — **Lieu** : DOUALA
**Dates** : 4, 5 et 6 août 2026 — **Effectif** : $N = 16$

**Version** : 2.0 — **Statut** : 🔒 **FIGÉ** le 15/07/2026. Corrige 4 erreurs de fond de la v1.0. Couvre **27 des 28** algorithmes.

> ⚠️ **Lire les [errata](#errata--corrections-non-intégrées) en fin de document avant toute implémentation.** Trois défauts connus ne sont **pas** corrigés dans le corps du texte : la portée du Théorème 6.11, le statut de l'Invariant 4.6, et l'absence de F3. Le corps est figé ; les errata font foi en cas de contradiction.

---

## Journal des corrections apportées à la v1.0

| # | Défaut v1.0 | Correction v2.0 |
|---|---|---|
| E1 | Sécurité fondée sur un sel « secret » dans une PWA — impossible | §3.3 : $\kappa$ reclassée en **détection d'erreur**, plus aucune prétention de sécurité |
| E2 | $\kappa$ évaluée hors de son domaine dans $\mathcal{V}$ | §3.3 : $\kappa$ définie sur $\mathcal{L}(R_{\text{id}})$, pas sur $I$ |
| E3 | Invariant 3.1 contredit par l'override $\varsigma^*$ | §4.4 : invariant **conditionné** au mode automatique |
| E4 | Théorème CRDT énoncé sur un modèle amputé de D4 (annulation) | §4 : treillis à **tombstones générationnels**, D4 intégrée, théorème rétabli |
| D1 | Ordre partiel jamais défini | §4.3 : $\preceq$ défini, $\sqcup$ prouvée borne sup |
| D2 | $\Pi_1(\mu^*)$ mal typé | §8.1 : **type somme** à constructeurs + filtrage |
| D3 | Fuseau horaire absent | §2.3 : `Africa/Douala`, UTC+1 fixe |
| D4 | Idempotence de $\mathrm{norm}$ sur-généralisée | §3.1 : NFKD, énoncé restreint à $\mathcal{N}$ |
| D5 | Pipeline de bout en bout jamais composé | §7 : $\mathrm{Scan}$ définie par composition |
| C1 | 10 algorithmes absents | §3.5, §5, §6.1, §6.5, §8.4–8.5, §9 |

**Découverte incidente.** Le séparateur `|` de la v1.0 **n'appartient pas au jeu alphanumérique QR** (ISO/IEC 18004 : `0-9 A-Z espace $ % * + - . / :`). Il forçait l'encodage en mode octet, soit +60 % de modules. Le séparateur devient `-` (§3.4).

---

## 1. Notations

| Symbole | Signification |
|---|---|
| $\Sigma$ | alphabet Unicode ; $\Sigma^*$ les chaînes finies ; $\varepsilon$ la chaîne vide |
| $\Vert$ | concaténation |
| $\bot$ | valeur indéfinie / absence d'observation |
| $A \rightharpoonup B$ | fonction **partielle** ; $\mathrm{dom}\,f$ son domaine |
| $A \uplus B$ | union disjointe (type somme) |
| $\mathcal{P}(A)$ | ensemble des parties |
| $\mathbb{T}$ | instants, en secondes epoch UTC ($\mathbb{T} \subset \mathbb{Z}$) |
| $[\![a,b]\!]$ | $\{a, a+1, \dots, b\}$ |
| $\mathcal{L}(R)$ | langage de l'expression régulière $R$ |
| $\leq_{\text{lex}}$ | ordre lexicographique |
| $\mathrm{Inj}(f)$ | $f$ est injective |

Les constructeurs de type somme sont notés en petites capitales : $\textsc{Present}(\tau)$.

---

## 2. Domaines

### 2.1 Participants

$$P = \{p_1, \dots, p_N\}, \quad N = 16, \qquad p_n = (n, \nu_n) \in [\![1,N]\!] \times \Sigma^*$$

$n$ est le **numéro d'ordre du document source** (clé de tri du rapport, jamais recalculée) ; $\nu_n$ le **nom complet verbatim**.

> **Atomicité de $\nu$.** La décomposition nom/prénom n'est pas une fonction bien définie sur cet ensemble : `ENAM NDONGO Benjamin Davy` et `BUINDA Theophilus YUKBANWI` admettent des découpages contradictoires (patronyme composé antéposé vs postposé). $\nu_n$ reste atomique. La casse est porteuse d'information (NOM en capitales, Prénoms en capitale initiale) et n'est jamais altérée à l'affichage.

### 2.2 Dates et créneaux

$$D = \{d_1, d_2, d_3\}, \quad d_1 = \text{2026-08-04},\ d_2 = \text{2026-08-05},\ d_3 = \text{2026-08-06}$$

$$C = \{\texttt{matin}, \texttt{midi}\}, \qquad S = D \times C, \qquad |S| = 6$$

### 2.3 Ancrage temporel

Soit $Z = \texttt{Africa/Douala}$. **Fait** : $Z$ est un décalage constant $+01\text{:}00$ sans heure d'été, sur tout l'intervalle considéré.

$$\mathrm{loc}_Z : \mathbb{T} \to \text{Date} \times \text{Heure}, \qquad \mathrm{loc}_Z(t) = \mathrm{civil}(t + 3600)$$

**Propriété 2.1 (bijectivité).** $Z$ étant à décalage constant, $\mathrm{loc}_Z$ est **bijective**. Il n'existe ni instant local ambigu (repli d'heure d'été) ni instant local inexistant (avance). Toutes les fonctions ci-dessous qui convertissent une heure murale en instant sont donc bien définies.

> C'est ce qui autorise $\varsigma$ (§6.3) à être une fonction sans clause de désambiguïsation. Sous un fuseau à DST, $\varsigma$ devrait être une relation.

On note $\mathrm{date}(t) = \Pi_1(\mathrm{loc}_Z(t))$.

Fenêtres, pour $\alpha_{\text{m}}, \beta, \omega_{\text{s}}$ définis en §11 :

$$
W(d, \texttt{matin}) = [\,\mathrm{loc}_Z^{-1}(d, \alpha_{\text{m}}),\ \mathrm{loc}_Z^{-1}(d, \beta)\,), \qquad
W(d, \texttt{midi}) = [\,\mathrm{loc}_Z^{-1}(d, \beta),\ \mathrm{loc}_Z^{-1}(d, \omega_{\text{s}})\,)
$$

On note $W(s) = [\alpha(s), \omega(s))$.

**Propriété 2.2 (disjonction).** $\forall s \neq s' \in S,\ W(s) \cap W(s') = \emptyset$.

*Preuve.* Deux slots de dates distinctes sont séparés car $\omega_{\text{s}} < 24\text{h} + \alpha_{\text{m}}$ et $\mathrm{loc}_Z$ est monotone. Deux slots de même date sont $[\alpha_{\text{m}}, \beta)$ et $[\beta, \omega_{\text{s}})$, disjoints par demi-ouverture à droite. $\square$

**Propriété 2.3 (non-recouvrement).** $\bigcup_{s\in S} W(s) \subsetneq \mathbb{T}$. Le complémentaire — nuits, pause déjeuner hors bornes, dates hors formation — est non vide et **doit** recevoir un traitement explicite (§6.3, résultat $\textsc{HorsSession}$).

---

## 3. Module A — Préparation

### 3.1 A1 — Normalisation

Soit $\mathcal{N} = \{\nu_1, \dots, \nu_{16}\} \cup \Sigma_{\text{saisie}}^*$ le domaine réel (noms du document, requêtes de recherche).

$$\mathrm{norm} : \Sigma^* \to \Sigma^*, \qquad
\mathrm{norm} = \mathrm{trim} \circ \mathrm{squeeze} \circ \mathrm{lower}_{\text{inv}} \circ \mathrm{strip}_\diamond \circ \mathrm{NFKD}$$

- $\mathrm{NFKD}$ : décomposition **de compatibilité** (et non NFD) — décompose aussi les ligatures (`ﬁ` $\to$ `fi`) et les formes de largeur ;
- $\mathrm{strip}_\diamond$ : suppression des points de code de catégorie générale `Mn` ;
- $\mathrm{lower}_{\text{inv}}$ : minuscules **invariantes de locale** (`toLowerCase()` sans locale, jamais `toLocaleLowerCase()`) ;
- $\mathrm{squeeze}$ : toute sous-chaîne d'espaces $\to$ un espace ; $\mathrm{trim}$ : bords.

**Propriété 3.1 (idempotence, restreinte).**
$$\forall x \in \mathcal{N}, \quad \mathrm{norm}(\mathrm{norm}(x)) = \mathrm{norm}(x)$$

*Preuve.* $\mathrm{NFKD}$ est idempotente (normalisation Unicode). Sur $\mathrm{NFKD}(\Sigma^*)$, $\mathrm{strip}_\diamond$ est idempotente (elle retire tous les `Mn`, il n'en reste aucun). $\mathrm{lower}_{\text{inv}}$ est idempotente **hors des cas pathologiques** (`İ` U+0130, dont la minuscule invariante est `i` + U+0307, un `Mn` réintroduit *après* $\mathrm{strip}_\diamond$). $\mathcal{N}$ ne contient pas U+0130. $\mathrm{squeeze}$ et $\mathrm{trim}$ sont idempotentes et préservent l'absence d'espaces multiples. $\square$

> **Portée de l'énoncé.** L'idempotence est fausse sur $\Sigma^*$ entier : $\mathrm{norm}(\texttt{İ}) = \texttt{i̇}$ contient un `Mn`, et $\mathrm{norm}(\mathrm{norm}(\texttt{İ})) = \texttt{i}$. La v1.0 énonçait la propriété sur $\Sigma^*$ : c'était faux. L'ordre $\mathrm{strip}_\diamond$ *avant* $\mathrm{lower}$ est ce qui crée le contre-exemple ; l'inverser le supprimerait, au prix d'autres cas. On conserve l'ordre et on restreint l'énoncé.

**Usage.** $\mathrm{norm}$ ne sert qu'à l'indexation et à la recherche (§8.4). Jamais à l'affichage, jamais au rapport.

### 3.2 A2 — Identifiants

$$\iota : P \to I, \qquad \iota(p_n) = \texttt{BIM26-} \Vert \mathrm{pad}_3(n)$$

**Propriété 3.2.** $\mathrm{Inj}(\iota)$.
*Preuve.* $\mathrm{pad}_3$ est injective sur $[\![1,999]\!]$ (l'écriture décimale à longueur fixe est unique) ; le préfixe est constant. $\square$

$\iota$ admet donc une inverse à gauche $\iota^{-1} : I \rightharpoonup P$, avec $I = \iota(P)$, $|I| = 16$.

### 3.3 A3 — Somme de contrôle

$$R_{\text{id}} = \texttt{^BIM26-[0-9]\{3\}\$}, \qquad \kappa : \mathcal{L}(R_{\text{id}}) \to \Xi$$

$$\kappa(x) = \mathrm{b32}_2\big(h(x \Vert \sigma) \bmod 2^{10}\big), \qquad \Xi = \{\texttt{A}..\texttt{Z},\texttt{2}..\texttt{7}\}^2, \ |\Xi| = 2^{10}$$

$h$ = SHA-256, $\sigma$ = constante de projet (§11).

> **Correction de typage (E2).** La v1.0 posait $\kappa : I \to \Xi$ puis évaluait $\kappa(w_{\text{id}})$ avant d'avoir établi $w_{\text{id}} \in I$ — application hors domaine. Le domaine est désormais $\mathcal{L}(R_{\text{id}}) \supsetneq I$ : $\kappa$ est définie sur `BIM26-999` comme sur `BIM26-001`, ce qui rend $\mathcal{V}$ bien formée quel que soit l'ordre d'évaluation des conjonctions.

> **Correction de statut (E1).** La v1.0 affirmait que la sécurité reposait sur la confidentialité de $\sigma$. **C'est intenable** : une PWA livre l'intégralité de son code au client ; $\sigma$ est lisible dans le bundle par quiconque ouvre les outils de développement. La confidentialité est impossible *par construction du support*, pas par faiblesse du paramétrage — allonger $\sigma$ ou $|\Xi|$ n'y change rien.
>
> $\kappa$ est donc reclassée en **code détecteur d'erreur**, au même titre qu'un bit de parité. Elle détecte : un QR étranger scanné par mégarde, un badge d'un autre lot, une faute de frappe en saisie de secours. Elle **ne prévient aucune fraude délibérée**. Un participant qui veut faire pointer un absent peut de toute façon présenter le badge imprimé de celui-ci — attaque contre laquelle aucune cryptographie côté client ne peut rien. Le contrôle anti-fraude réel est humain (l'opérateur voit le nom s'afficher, §7.4), pas mathématique.

**Propriété 3.3 (taux de détection).** Pour $w$ de forme valide et d'origine arbitraire, $h$ modélisée en oracle aléatoire :
$$\Pr[\text{non détecté}] = |\Xi|^{-1} = 2^{-10} \approx 9{,}77\times10^{-4}$$
Soit un taux de détection $\approx 99{,}90\,\%$. Suffisant : le nombre d'événements erronés attendus sur 3 jours est de l'ordre de $10^0$, l'espérance de non-détection est $\approx 10^{-3}$.

### 3.4 A4 — Encodage QR

$$\pi : \mathcal{L}(R_{\text{id}}) \to \Pi, \qquad \pi(x) = x \Vert \texttt{-} \Vert \kappa(x)$$

Exemple : $\pi(\texttt{BIM26-001}) = \texttt{BIM26-001-A7}$, soit $|\pi(x)| = 12$.

**Langage complet** : $R = \texttt{^BIM26-([0-9]\{3\})-([A-Z2-7]\{2\})\$}$

> **Choix du séparateur.** ISO/IEC 18004 définit le jeu alphanumérique QR :
> $$\mathcal{A}_{\text{QR}} = \{\texttt{0}..\texttt{9}\} \cup \{\texttt{A}..\texttt{Z}\} \cup \{\texttt{espace}, \texttt{\$}, \texttt{\%}, \texttt{*}, \texttt{+}, \texttt{-}, \texttt{.}, \texttt{/}, \texttt{:}\}$$
> Le `|` de la v1.0 **n'y appartient pas**. Il forçait le mode octet : 8 bits/caractère contre 5,5 en alphanumérique, soit +45 % de charge utile et une version QR supérieure. Avec `-` : $\pi(x) \in \mathcal{A}_{\text{QR}}^{12}$.

**Encodeur** : $\mathrm{qr} : \mathcal{A}_{\text{QR}}^* \times \mathcal{E} \to \{0,1\}^{n\times n}$ (ISO/IEC 18004), $\mathcal{E}$ = niveau de correction.

**Propriété 3.4 (capacité).** Pour $\mathcal{E} = Q$ (25 % de redondance), la version 1 ($21\times21$) admet **16 caractères alphanumériques**. Or $|\pi(x)| = 12 \leq 16$. Donc :
$$\forall x \in \mathcal{L}(R_{\text{id}}),\quad \mathrm{qr}(\pi(x), Q) \in \{0,1\}^{21\times21}$$
Tous les badges ont la **même version**, donc la même taille physique et la même densité — condition nécessaire à une planche imprimée homogène et à une distance de lecture constante. Le niveau $Q$ est retenu (et non $L$) car les badges papier sont manipulés, pliés et salis.

### 3.5 A5 — Mise en page des badges

Pour $k$ badges par page :
$$\Lambda = \left\lceil \frac{N}{k} \right\rceil, \qquad \mathrm{pos}(n) = \Big(\big\lfloor \tfrac{n-1}{k} \big\rfloor + 1,\ ((n-1) \bmod k) + 1\Big)$$

**Propriété 3.5.** $\mathrm{pos}$ est injective, et $\mathrm{pos}([\![1,N]\!])$ est un segment initial de l'ordre lexicographique sur $[\![1,\Lambda]\!] \times [\![1,k]\!]$. Aucun badge n'est perdu ni dupliqué.

Pour $N=16, k=8$ : $\Lambda = 2$ pages pleines.

---

## 4. Module B — Persistance et fusion

C'est le cœur formel du système. La v1.0 y comportait sa faute la plus grave.

### 4.1 Espace des clés

$$K = I \times S, \qquad |K| = 16 \times 6 = 96$$

### 4.2 Valeurs : le treillis local

$$V = \underbrace{\mathbb{N}}_{\text{génération } g} \times \underbrace{\{\textsc{Actif}, \textsc{Annulé}\}}_{\text{statut } \varsigma} \times \underbrace{\mathbb{T}}_{\tau} \times \underbrace{M}_{\text{mode}} \times \underbrace{\mathrm{Dev}}_{\text{appareil}}$$

avec $M = \{\texttt{scan}, \texttt{manuel}\}$ et $\mathrm{Dev}$ un ensemble d'UUID d'appareils, **totalement ordonné** (ordre lexicographique sur les chaînes).

$$V_\bot = V \uplus \{\bot\}$$

**Rang.** On définit $\rho : V_\bot \to \mathbb{N} \times \{0,1\} \times \mathbb{Z} \times \{0,1\} \times \mathrm{Dev}$ :

$$\rho(\bot) = -\infty, \qquad \rho(g, \varsigma, \tau, \mu, e) = \big(g,\ r_\varsigma(\varsigma),\ -\tau,\ r_\mu(\mu),\ e\big)$$

$$r_\varsigma(\textsc{Actif}) = 0,\quad r_\varsigma(\textsc{Annulé}) = 1, \qquad r_\mu(\texttt{scan}) = 0,\quad r_\mu(\texttt{manuel}) = 1$$

**Ordre local** : $v \preceq_V v' \iff \rho(v) \leq_{\text{lex}} \rho(v')$.

**Propriété 4.1 (totalité).** $\preceq_V$ est un **ordre total** sur $V_\bot$.

*Preuve.* $\leq_{\text{lex}}$ sur un produit fini d'ensembles totalement ordonnés est total. $\mathbb{N}$, $\{0,1\}$, $\mathbb{Z}$, $\mathrm{Dev}$ le sont. L'antisymétrie exige l'injectivité de $\rho$ : deux valeurs de même rang partagent $(g, \varsigma, \tau, \mu, e)$, donc sont égales. $\bot$ est minimum. $\square$

> **Rôle des composantes**, dans l'ordre de priorité :
> 1. $g$ (génération) — **domine tout**. C'est ce qui autorise l'annulation puis le re-pointage, impossible avec un simple 2P-Set.
> 2. $r_\varsigma$ — à génération égale, $\textsc{Annulé}$ l'emporte (*remove-wins* local).
> 3. $-\tau$ — à génération et statut égaux, le rang **maximal** correspond au $\tau$ **minimal** : c'est la règle métier « le premier pointage gagne » (l'heure d'entrée en salle est celle de la première présentation du badge).
> 4. $r_\mu$, puis $e$ — départage pur, sans sémantique. Leur seule fonction est de rendre $\rho$ injective, donc $\preceq_V$ antisymétrique, donc $\sqcup$ **fonctionnelle**. La v1.0 s'arrêtait avant et son $\sqcup$ n'était pas une fonction en cas d'égalité stricte des horodatages.

**Jointure locale** : $v \sqcup_V v' = \max_{\preceq_V}(v, v')$.

**Lemme 4.2.** $(V_\bot, \preceq_V, \sqcup_V, \bot)$ est un demi-treillis supérieur borné inférieurement.
*Preuve.* Sur un ordre **total**, $\max$ est la borne supérieure ; $\max$ est idempotent, commutatif, associatif ; $\bot$ est neutre car minimum. $\square$

### 4.3 États : le treillis produit

$$\mathcal{M} = V_\bot^{\,K} \qquad\text{(fonction totale ; } m(k) = \bot \text{ dénote « jamais observé »)}$$

$$m \preceq m' \iff \forall k \in K,\ m(k) \preceq_V m'(k), \qquad (m \sqcup m')(k) = m(k) \sqcup_V m'(k)$$

$$\bot_\mathcal{M} = \lambda k.\,\bot$$

**Théorème 4.3.** $(\mathcal{M}, \preceq, \sqcup, \bot_\mathcal{M})$ est un **demi-treillis supérieur borné inférieurement**, et $\sqcup$ est la **borne supérieure** de $\preceq$ :

1. Idempotence : $m \sqcup m = m$
2. Commutativité : $m \sqcup m' = m' \sqcup m$
3. Associativité : $(m_1 \sqcup m_2) \sqcup m_3 = m_1 \sqcup (m_2 \sqcup m_3)$
4. Neutre : $m \sqcup \bot_\mathcal{M} = m$
5. $m \sqcup m'$ est le plus petit majorant de $\{m, m'\}$

*Preuve.* Les propriétés 1–4 sont ponctuelles : elles se déduisent du Lemme 4.2 appliqué en chaque $k \in K$, car $\sqcup$ est défini point à point. Pour 5 : $m \preceq m\sqcup m'$ et $m' \preceq m \sqcup m'$ par définition du max ; et si $u$ majore $m$ et $m'$, alors $\forall k,\ m(k) \preceq_V u(k)$ et $m'(k) \preceq_V u(k)$, donc $\max(m(k), m'(k)) \preceq_V u(k)$, donc $m \sqcup m' \preceq u$. $\square$

> **Correction de la faute E4 / D1.** La v1.0 (a) définissait $\sqcup$ par $\min$ sur $\tau$ sans jamais définir $\preceq$, et concluait « demi-treillis » à partir de simples identités algébriques ; (b) **omettait silencieusement D4 (annulation)**, ce qui rendait le théorème vrai sur un modèle amputé. Une suppression n'est pas croissante : sans tombstone, si l'appareil 1 annule un pointage et fusionne avec l'appareil 2 qui le détient encore, l'enregistrement **ressuscite** (problème classique du 2P-Set). Le compteur $g$ et le statut $\varsigma$ règlent les deux points à la fois.

**Corollaire 4.4 (convergence).** $\mathcal{M}$ est un **CvRDT** (CRDT état-convergent). Pour toute famille finie d'états $\{m_i\}$ et toute séquence de fusions par paires les couvrant, le résultat est $\bigsqcup_i m_i$, **indépendant de l'ordre, de l'associativité et des répétitions**.

*Preuve.* Conséquence directe de 1–3 du Théorème 4.3 : dans un demi-treillis, toute évaluation d'un $\sqcup$ itéré sur un multi-ensemble donne la borne supérieure de son support. $\square$

**Conséquence d'ingénierie.** La synchronisation multi-appareils est correcte **sans serveur, sans horloge partagée, sans ordre de messages**. Deux téléphones scannant en parallèle en salle, fusionnés par échange de fichier JSON dans un sens quelconque, un nombre quelconque de fois, convergent. C'est ce qui rend le mode 100 % hors-ligne tenable.

> **Limite honnête.** La convergence ne garantit pas la *vérité*. Si les horloges des deux appareils divergent de $\Delta_{\text{clock}}$, le $\tau$ retenu est le plus petit *tel que mesuré*, pas le plus précoce en temps réel. L'erreur sur $\tau$ est bornée par $\Delta_{\text{clock}}$, sans effet sur le statut P/A (dont la granularité est le créneau, $\approx 6$ h). Aucune correction n'est nécessaire ; il faut seulement ne pas prétendre à une précision que le modèle n'a pas.

### 4.4 Invariants

**Invariant 4.5 (intégrité référentielle).** $\forall (x,s) \in K,\ m(x,s) \neq \bot \implies x \in I$.
Trivialement garanti par $K = I \times S$.

**Invariant 4.6 (cohérence temporelle, conditionnée).**
$$\forall k = (x,s) \in K,\quad \big(m(k) = (g,\varsigma,\tau,\texttt{scan},e) \ \wedge\ o_k = \texttt{auto}\big) \implies \tau \in W(s)$$
où $o_k$ est la valeur de l'override au moment de l'écriture.

> **Correction de la faute E3.** La v1.0 énonçait $\tau \in W(s)$ « sauf saisie forcée » — un invariant à exception n'est pas un invariant. Pire, l'exception était **produite par un autre algorithme du même document** : l'override $\varsigma^*(t,o)$ avec $o \in C$ écrit délibérément un enregistrement en mode `scan` avec $\tau \notin W(s)$ ; c'est sa raison d'être. La garde porte donc désormais sur $o_k = \texttt{auto}$, seul régime où l'invariant est réellement maintenu. En mode `manuel` ou sous override, aucune contrainte : $\tau$ est un simple horodatage d'audit.

### 4.5 B2 — Import de la liste

$$\mathrm{imp} : \Sigma^* \to (P^N \times \mathcal{M}) \uplus \{\textsc{Err}\}$$

Précondition de validité du fichier source : $\varphi(L) \iff |L| = N \wedge \mathrm{Inj}(n \mapsto \nu_n) \wedge \forall n,\ \mathrm{norm}(\nu_n) \neq \varepsilon$.

**Atomicité.** $\mathrm{imp}$ s'exécute dans une transaction $\mathcal{T}$ telle que l'état observable est soit l'état antérieur, soit l'état complet postérieur — jamais un intermédiaire. Formellement, $\mathrm{imp}$ est **totale ou nulle** : $\neg\varphi(L) \implies$ état inchangé.

**Propriété 4.7.** L'import **n'écrase jamais** $m$ : $\mathrm{imp}$ n'écrit que sur $P$. Un ré-import de la liste après le jour 1 préserve tous les pointages, dès lors que $\iota$ est stable (ce qui découle de la stabilité de $n$, §2.1).

### 4.6 B3 — Export / B4 — Import de sauvegarde

$$\mathrm{ser} : P^N \times \mathcal{M} \times \mathbb{N} \to \Sigma^*, \qquad \mathrm{des} : \Sigma^* \rightharpoonup P^N \times \mathcal{M} \times \mathbb{N}$$

(le troisième argument est la version de schéma, §12).

**Propriété 4.8 (aller-retour).** $\mathrm{des} \circ \mathrm{ser} = \mathrm{id}$ sur $P^N \times \mathcal{M} \times \{\text{version courante}\}$.
$\mathrm{ser}$ est injective ; $\mathrm{des}$ est partielle (elle rejette les JSON malformés ou de version inconnue).

**Fusion de sauvegarde** : $\mathrm{merge}(m, \text{fichier}) = m \sqcup \Pi_2(\mathrm{des}(\text{fichier}))$, dont toutes les garanties sont celles du Corollaire 4.4.

---

## 5. Module C1 — Capture vidéo

Le flux caméra est un signal $\mathcal{F} : \mathbb{T} \to \mathcal{I}$ vers l'espace des images. L'application l'échantillonne :

$$t_i = t_0 + i \cdot f^{-1}, \qquad f = 10\ \mathrm{Hz}$$

**Région d'intérêt** : $\mathrm{roi} : \mathcal{I} \to \mathcal{I}'$, restriction au carré central de côté $\min(w,h)/2$, donc $|\mathcal{I}'| = |\mathcal{I}|/4$ pour une image carrée.

**Propriété 5.1 (borne de détection).** Un badge présenté pendant $T$ secondes produit au plus $\lceil fT \rceil$ tentatives de décodage. Pour $T = 2\,\mathrm{s},\ f = 10$ : 20 tentatives.

> **Justification de $f = 10$ et non $f = 60$.** Le décodage est en $O(|\mathcal{I}|)$ par trame ; à 60 Hz le coût est $6\times$ pour un gain de latence perçue nul (le seuil de perception humaine est $\approx 100\,\mathrm{ms} = f^{-1}$). La contrainte est thermique et énergétique, **non algorithmique** (§10).

---

## 6. Module C — Scan

### 6.1 C2 — Décodage

$$\delta : \mathcal{I} \to \Sigma^* \uplus \{\bot\}$$

$\delta$ est **non déterministe en pratique** (bruit, flou de bougé, angle, occlusion). On la modélise en fonction sur l'échantillon $\mathcal{F}(t_i)$ : le non-déterminisme est absorbé par l'échantillonnage temporel, chaque $t_i$ produisant une image distincte.

**Propriété 6.1 (correction du décodeur).** ISO/IEC 18004, niveau $Q$ : $\delta(\mathrm{render}(\mathrm{qr}(\pi(x), Q))) = \pi(x)$ tant que la fraction de modules corrompus est $< 25\,\%$. Le décodeur ne produit pas de faux mots : au-delà du seuil, il retourne $\bot$, pas une chaîne erronée. **La détection d'erreur de §3.3 n'a donc pas à couvrir la corruption optique** — elle ne couvre que les QR étrangers bien lus.

### 6.2 C3 — Validation

$$
\mathrm{err} : \Sigma^* \to \{\textsc{Ok}, \textsc{Format}, \textsc{Checksum}, \textsc{Inconnu}\}
$$

$$
\mathrm{err}(w) =
\begin{cases}
\textsc{Format} & \text{si } w \notin \mathcal{L}(R) \\
\textsc{Checksum} & \text{sinon si } \kappa(w_{\text{id}}) \neq w_\kappa \\
\textsc{Inconnu} & \text{sinon si } w_{\text{id}} \notin I \\
\textsc{Ok} & \text{sinon}
\end{cases}
$$

**Propriété 6.2 (bonne définition).** Les gardes sont évaluées dans l'ordre. À la 2ᵉ ligne, $w \in \mathcal{L}(R)$ donc $w_{\text{id}} \in \mathcal{L}(R_{\text{id}}) = \mathrm{dom}\,\kappa$ : l'application est licite. C'est exactement ce que la v1.0 violait.

$$\mathcal{V}(w) \iff \mathrm{err}(w) = \textsc{Ok}$$

### 6.3 C5 — Résolution du slot

$$\varsigma : \mathbb{T} \to S \uplus \{\bot\}, \qquad
\varsigma(t) = \begin{cases} s & \text{si } \exists s \in S : t \in W(s) \\ \bot & \text{sinon}\end{cases}$$

**Propriété 6.3 (bonne définition).** Le $s$ est unique par la Propriété 2.2 (disjonction), et l'énoncé est non ambigu par la Propriété 2.1 (bijectivité de $\mathrm{loc}_Z$). Ces deux prémisses sont nécessaires : la v1.0 avait la première, pas la seconde.

### 6.4 C5b — Override opérateur

$$\varsigma^* : \mathbb{T} \times (C \uplus \{\texttt{auto}\}) \to S \uplus \{\bot\}$$

$$\varsigma^*(t,o) = \begin{cases}
\varsigma(t) & \text{si } o = \texttt{auto} \\
(\mathrm{date}(t),\, o) & \text{si } o \in C \wedge \mathrm{date}(t) \in D \\
\bot & \text{sinon}
\end{cases}$$

**Propriété 6.4 (couverture).** $\forall d \in D,\ \forall s \in \{d\}\times C,\ \exists t, o :\ \varsigma^*(t,o) = s$ pour tout $t$ tel que $\mathrm{date}(t) = d$.

> Autrement dit : à une date de formation donnée, **aucun slot n'est inatteignable**, quelle que soit l'heure de l'horloge. C'est la garantie qui neutralise la dérive d'horloge et le retardataire de 12h35. Sans override, $\varsigma$ seule rend le slot $(\,d,\texttt{matin})$ inatteignable dès $12\text{h}30$, sans recours.

### 6.5 C4 — Anti-rebond

Sur le flux des détections retenues $(w_i, t_i)_{i\in\mathbb{N}}$, $t_i < t_{i+1}$ :

$$\mathrm{ret}(i) \iff \neg\,\exists j < i:\ \mathrm{ret}(j) \wedge w_j = w_i \wedge t_i - t_j < \Delta, \qquad \Delta = 3\,\mathrm{s}$$

**Propriété 6.5.** Un badge présenté $T$ secondes produit $\lceil fT \rceil$ détections mais au plus $\lceil T/\Delta \rceil$ retenues. Pour $T=2,\ f=10$ : 20 détections, **1** retenue.

**Propriété 6.6 (bonne fondation).** $\mathrm{ret}$ est définie par récurrence forte sur $i$ ($\mathrm{ret}(i)$ ne dépend que des $\mathrm{ret}(j)$, $j<i$) ; l'ordre sur $\mathbb{N}$ étant bien fondé, $\mathrm{ret}$ est totale et unique.

### 6.6 C6 — Enregistrement

$$\mathcal{R} = \{\textsc{Ok}(p),\ \textsc{DejaPointe}(\tau),\ \textsc{Format},\ \textsc{Checksum},\ \textsc{Inconnu},\ \textsc{HorsSession},\ \textsc{Rien}\}$$

$$\mathrm{reg} : \mathcal{M} \times K \times \mathbb{T} \times M \to \mathcal{M} \times \mathcal{R}$$

$$\mathrm{reg}(m,k,t,\mu) =
\begin{cases}
\big(m,\ \textsc{DejaPointe}(\tau_k)\big) & \text{si } m(k) = (g,\textsc{Actif},\tau_k,\_,\_) \\[4pt]
\big(m[k \mapsto (g_k^+,\, \textsc{Actif},\, t,\, \mu,\, e)],\ \textsc{Ok}(\iota^{-1}(\Pi_1 k))\big) & \text{sinon}
\end{cases}$$

où $g_k^+ = g+1$ si $m(k) = (g,\textsc{Annulé},\dots)$, et $g_k^+ = 0$ si $m(k) = \bot$.

**Théorème 6.7 (idempotence).** Soit $m' = \Pi_1(\mathrm{reg}(m,k,t,\mu))$. Alors $\forall t', \mu'$ :
$$\Pi_1\big(\mathrm{reg}(m',k,t',\mu')\big) = m'$$

*Preuve.* Les deux branches produisent un $m'$ tel que $m'(k)$ est de statut $\textsc{Actif}$ : la première par hypothèse de garde, la seconde par construction. La garde du second appel est donc satisfaite, sélectionnant la première branche, qui retourne l'état inchangé. $\square$

**Corollaire 6.8.** L'anti-rebond (§6.5) est une **optimisation d'expérience utilisateur, non une garantie de correction**. La correction repose exclusivement sur le Théorème 6.7. Les deux mécanismes sont indépendants et doivent être testés séparément.

**Propriété 6.9 (croissance).** $m \preceq \Pi_1(\mathrm{reg}(m,k,t,\mu))$.
*Preuve.* Branche 1 : égalité. Branche 2 : soit $m(k) = \bot$ minimum, soit $m(k)$ de génération $g$ et le nouveau de génération $g+1 > g$, donc de rang strictement supérieur. Les autres clés sont inchangées. $\square$

> Cette propriété est ce qui rend $\mathrm{reg}$ **compatible** avec le CRDT : toute opération locale monte dans le treillis, donc ne peut être « défaite » par une fusion ultérieure.

### 6.7 D4 — Annulation

$$\mathrm{cancel} : \mathcal{M} \times K \to \mathcal{M} \uplus \{\textsc{Err}\}$$

$$\mathrm{cancel}(m,k) =
\begin{cases}
m[k \mapsto (g+1,\ \textsc{Annulé},\ \tau,\ \mu,\ e)] & \text{si } m(k) = (g, \textsc{Actif}, \tau, \mu, \_) \\
\textsc{Err} & \text{sinon}
\end{cases}$$

**Propriété 6.10 (croissance).** $m \preceq \mathrm{cancel}(m,k)$, car $g+1 > g$ domine lexicographiquement.

**Théorème 6.11 (non-résurrection).** Soit $m_1 = \mathrm{cancel}(m,k)$ et $m_2 = m$ (appareil n'ayant pas vu l'annulation). Alors $(m_1 \sqcup m_2)(k)$ est de statut $\textsc{Annulé}$.
*Preuve.* $\rho(m_1(k))$ a pour première composante $g+1$, $\rho(m_2(k))$ a $g$. $\max$ retient $m_1(k)$. $\square$

**Théorème 6.12 (re-pointage possible).** Après annulation à la génération $g+1$, $\mathrm{reg}$ produit la génération $g+2$, qui domine. La séquence $\mathrm{reg} \to \mathrm{cancel} \to \mathrm{reg}$ converge vers $\textsc{Actif}$ sur tous les appareils fusionnés.

> **C'est précisément ce qu'un 2P-Set ne sait pas faire** — et c'est pourquoi le Corollaire 3.4 de la v1.0 était vide de sens : il portait sur un modèle où l'annulation n'existait pas.

---

## 7. Composition : le pipeline de bout en bout

Aucune des fonctions ci-dessus n'est utile isolément. Voici ce qui est réellement implémenté.

$$\mathrm{Scan} : \mathcal{I} \times \mathbb{T} \times (C \uplus \{\texttt{auto}\}) \times \mathcal{M} \times \mathcal{H} \to \mathcal{M} \times \mathcal{R} \times \mathcal{H}$$

où $\mathcal{H}$ est l'historique de l'anti-rebond.

$$
\mathrm{Scan}(\mathrm{img}, t, o, m, H) =
\begin{cases}
(m,\ \textsc{Rien},\ H) & \text{si } \delta(\mathrm{roi}(\mathrm{img})) = \bot \quad (1)\\
(m,\ \textsc{Rien},\ H) & \text{si } \neg\,\mathrm{ret}(w,t,H) \quad (2)\\
(m,\ \mathrm{err}(w),\ H') & \text{si } \mathrm{err}(w) \neq \textsc{Ok} \quad (3)\\
(m,\ \textsc{HorsSession},\ H') & \text{si } \varsigma^*(t,o) = \bot \quad (4)\\
\mathrm{reg}\big(m,\ (w_{\text{id}}, \varsigma^*(t,o)),\ t,\ \texttt{scan}\big) \frown H' & \text{sinon} \quad (5)
\end{cases}
$$

avec $w = \delta(\mathrm{roi}(\mathrm{img}))$ et $H' = H \cup \{(w,t)\}$.

**Propriété 7.1 (exhaustivité et exclusivité).** Les cinq gardes sont exhaustives et mutuellement exclusives ; $\mathrm{Scan}$ est **totale**. Tout scan produit exactement un élément de $\mathcal{R}$.

**Propriété 7.2 (ordre des gardes).** L'ordre (1)→(5) est **contraint**, non arbitraire :
- (1) avant (2) : $\mathrm{ret}$ requiert un $w$ défini.
- (2) avant (3) : sinon un badge maintenu 2 s émettrait 20 sons d'erreur.
- (3) avant (4) : un QR étranger doit être rejeté comme tel, même hors créneau. L'inverse afficherait « hors session » pour un ticket de caisse.
- (4) avant (5) : $\mathrm{reg}$ requiert $s \neq \bot$ pour construire $k$.

**Propriété 7.3 (croissance).** $m \preceq \Pi_1(\mathrm{Scan}(\dots))$ dans les cinq branches — trivial pour (1)–(4), Propriété 6.9 pour (5). Donc $\mathrm{Scan}$ est compatible avec le CRDT.

### 7.4 C7 — Retour perceptif

$$\varrho : \mathcal{R} \to (F \times \mathbb{N}) \times \Phi \times \Sigma^*$$

| $r \in \mathcal{R}$ | son | couleur | message |
|---|---|---|---|
| $\textsc{Ok}(p)$ | 880 Hz, 120 ms | vert | $\nu_p$ |
| $\textsc{DejaPointe}(\tau)$ | 660 Hz × 2, 80 ms | orange | heure $\mathrm{loc}_Z(\tau)$ |
| $\textsc{Format}$ | 220 Hz, 300 ms | rouge | code non reconnu |
| $\textsc{Checksum}$ | 220 Hz, 300 ms | rouge | badge non valide |
| $\textsc{Inconnu}$ | 220 Hz, 300 ms | rouge | non inscrit |
| $\textsc{HorsSession}$ | 440 Hz, 200 ms | gris | hors créneau |
| $\textsc{Rien}$ | — | — | — |

**Propriété 7.4 (discriminabilité).** L'image de $\varrho$ restreinte au son comporte 4 classes séparées d'au moins une quinte juste (rapport $\geq 3/2$), donc perceptivement distinctes sans attention focalisée. L'opérateur n'a pas besoin de regarder l'écran pour le cas nominal.

> $\textsc{Ok}$ affiche $\nu_p$ : c'est **le seul contrôle anti-fraude réel du système** (§3.3). L'opérateur voit le nom et le visage. Aucune propriété mathématique ne s'y substitue.

---

## 8. Modules D et E

### 8.1 E1 — État de cellule (type somme)

$$\mathrm{Cell} = \textsc{Present}(\mathbb{T}) \ \uplus\ \textsc{Absent} \ \uplus\ \textsc{Vide}$$

$$\mu^* : P \times S \times \mathbb{T} \to \mathrm{Cell}$$

$$
\mu^*(p,s,t_{\text{now}}) =
\begin{cases}
\textsc{Present}(\tau) & \text{si } m(\iota(p), s) = (\_,\ \textsc{Actif},\ \tau,\ \_,\ \_) \\[4pt]
\textsc{Absent} & \text{sinon si } t_{\text{now}} \geq \omega(s) \\[4pt]
\textsc{Vide} & \text{sinon}
\end{cases}
$$

> **Correction du défaut D2.** La v1.0 écrivait $\Pi_1(\mu^*(p,s))$ — une projection appliquée à $\textsc{Absent}$, qui n'est pas un couple. Le typage somme impose désormais un **filtrage par constructeur**, et le prédicat ci-dessous remplace toute projection.

$$\mathrm{estP} : \mathrm{Cell} \to \{0,1\}, \qquad \mathrm{estP}(c) = 1 \iff \exists \tau,\ c = \textsc{Present}(\tau)$$

**Propriété 8.1 (totalité et exclusivité).** $\mu^*$ est **totale** sur $P \times S$ : les trois gardes sont exhaustives et mutuellement exclusives. Chacune des $16 \times 6 = 96$ cellules reçoit exactement une valeur.

**Propriété 8.2 (non-imputation d'absence future).**
$$t_{\text{now}} < \omega(s) \implies \mu^*(p,s,t_{\text{now}}) \neq \textsc{Absent}$$

> **La propriété critique du document.** Sans elle, un rapport édité à la fin du jour 1 marquerait $2 \times 2 \times 16 = 64$ absences fictives (jours 2 et 3). La garde porte sur $\omega(s)$ — **fin** du créneau — et non $\alpha(s)$ : un rapport imprimé à 10 h ne doit pas déclarer absents les participants du créneau du matin **encore en cours**.

**Propriété 8.3 (une annulation efface la présence).** Si $m(\iota(p),s)$ est de statut $\textsc{Annulé}$, la première garde échoue et la cellule vaut $\textsc{Absent}$ ou $\textsc{Vide}$ selon $t_{\text{now}}$. Le tombstone est donc **transparent au rapport** : il vit dans le treillis, jamais sur le papier.

### 8.2 E2 — Statistiques

$$\mathrm{Pr}(s, t_{\text{now}}) = \sum_{p \in P} \mathrm{estP}\big(\mu^*(p,s,t_{\text{now}})\big), \qquad \theta(s) = \frac{\mathrm{Pr}(s)}{N} \in [0,1]$$

$$a(p) = \sum_{s \in S} \mathrm{estP}\big(\mu^*(p,s,t_{\text{now}})\big) \in [\![0,6]\!]$$

Slots échus : $S_\downarrow(t_{\text{now}}) = \{s \in S : t_{\text{now}} \geq \omega(s)\}$.

$$\Theta(t_{\text{now}}) = \begin{cases}
\dfrac{\sum_{s \in S_\downarrow} \mathrm{Pr}(s)}{N \cdot |S_\downarrow|} & \text{si } S_\downarrow \neq \emptyset \\[10pt]
\bot & \text{sinon}
\end{cases}$$

> **$\bot$ et non $0$.** Avant le premier créneau échu, le taux global n'est pas nul : il est **indéfini**. Diviser par $N \cdot |S|$ au lieu de $N \cdot |S_\downarrow|$ sous-estimerait mécaniquement le taux d'un facteur $|S_\downarrow|/|S|$ — un rapport de fin de jour 1 afficherait 33 % au lieu de 100 % pour une assiduité parfaite.

**Propriété 8.4 (monotonie de $S_\downarrow$).** $t \leq t' \implies S_\downarrow(t) \subseteq S_\downarrow(t')$. Le dénominateur croît, jamais ne décroît.

### 8.3 E3 — Tris et filtres

Un tri est une permutation $\varpi \in \mathfrak{S}_N$ induite par une clé $\chi : P \to X$ sur un ensemble totalement ordonné.

- Ordre document : $\chi(p_n) = n$ — **c'est le défaut, non négociable pour le rapport officiel** ;
- Ordre alphabétique : $\chi(p_n) = \mathrm{norm}(\nu_n)$ ;
- Ordre d'assiduité : $\chi(p_n) = (-a(p_n), n)$, la seconde composante rendant le tri **stable** (déterministe à assiduité égale).

Filtre : $\Phi_\text{abs} = \{p \in P : a(p) < |S_\downarrow|\}$.

**Propriété 8.5.** Les tris et filtres n'agissent que sur la **présentation** : $\varpi$ ne modifie ni $m$ ni $\mu^*$. Le rapport PDF officiel utilise exclusivement $\chi(p_n) = n$.

### 8.4 D1–D2 — Recherche de secours

Index : $\hat\nu_n = \mathrm{norm}(\nu_n)$.

$$\mathrm{match}(q) = \{\, p_n \in P\ :\ \mathrm{norm}(q) \sqsubseteq \hat\nu_n \,\}, \qquad \sqsubseteq = \text{relation de sous-chaîne}$$

**Propriété 8.6 (monotonie).** $q \sqsubseteq q' \implies \mathrm{match}(q') \subseteq \mathrm{match}(q)$.
*Preuve.* $\sqsubseteq$ est transitive : $\mathrm{norm}(q') \sqsubseteq \hat\nu_n \wedge \mathrm{norm}(q) \sqsubseteq \mathrm{norm}(q') \implies \mathrm{norm}(q) \sqsubseteq \hat\nu_n$. (L'implication $q \sqsubseteq q' \Rightarrow \mathrm{norm}(q) \sqsubseteq \mathrm{norm}(q')$ vaut sur $\mathcal{N}$, où $\mathrm{norm}$ opère caractère par caractère hors $\mathrm{squeeze}/\mathrm{trim}$.) $\square$

> Conséquence : la frappe incrémentale ne fait que **restreindre**. Le filtrage opère sur le résultat précédent, sans rebalayer $P$.

**Propriété 8.7 (robustesse aux diacritiques).** $p_{10} \in \mathrm{match}(\texttt{"stephane"})$ bien que $\nu_{10} = \texttt{"NDJOMO Christian Stéphane"}$, par $\mathrm{strip}_\diamond \circ \mathrm{NFKD}$.

### 8.5 D3 — Pointage manuel

$$\mathrm{regM}(m,k,t) = \mathrm{reg}(m,k,t,\texttt{manuel})$$

Même fonction, même idempotence (Théorème 6.7), même croissance (Propriété 6.9). Seul $\mu$ diffère, ce qui préserve la traçabilité : le rapport peut distinguer scan et saisie, et l'Invariant 4.6 ne s'applique pas.

### 8.6 E4 — Mise en page du rapport

Soit $L$ la largeur utile de la page A4 portrait : $L = 210 - 2\lambda$ mm, $\lambda$ = marge.

Vecteur de largeurs $\mathbf{c} = (c_1, \dots, c_{11})$ pour les colonnes N°, THÈMES, LIEU, PERSONNELS, EFFECTIFS, puis les 6 cases $S$.

**Contrainte 8.8 (conservation).** $\sum_{j=1}^{11} c_j = L$.

**Contrainte 8.9 (lisibilité).** Pour chaque cellule de contenu textuel $x$ rendu à la taille $\phi$ : $\mathrm{largeur}_\phi(x) \leq c_j - 2\pi_{\text{cell}}$, ou bien $x$ se rompt sur $\geq 2$ lignes.

**Propriété 8.10 (nécessité du rendu bi-ligne).** Avec $\lambda = 15$, $L = 180$ mm. Les 5 premières colonnes consomment $\approx 96$ mm (proportions du document source), laissant $84/6 = 14$ mm par case. Or $\mathrm{largeur}_{8\text{pt}}(\texttt{"P 08h42"}) \approx 16\ \mathrm{mm} > 14$. Donc, sous la Contrainte 8.9, le rendu **doit** être bi-ligne (`P` au-dessus de l'heure) — ou la page doit passer en paysage ($L = 267$ mm, $\Rightarrow 28$ mm/case).

**Contrainte 8.11 (pagination).** L'en-tête à deux niveaux est répété sur chaque page (`thead` + `table-header-group`) ; aucune ligne participant n'est coupée (`break-inside: avoid`). Pour $N=16$ et une hauteur de ligne $\approx 8$ mm, le tableau tient sur **1 page** : la contrainte est prospective.

> La mise en page est une contrainte **typographique**, pas mathématique. Elle est formalisée ici uniquement parce que la Propriété 8.10 est un résultat non évident, dont dépend une décision d'orientation de page.

---

## 9. Module F — Infrastructure PWA

### 9.1 F1–F2 — Cache versionné

$$\mathcal{C} : \mathrm{URL} \rightharpoonup \mathrm{Ressource} \times \mathbb{N}$$

Soit $A$ l'ensemble des assets requis (HTML, JS, CSS, polices, **les 3 logos extraits du .docx en base64**, l'audio étant synthétisé et non chargé).

**Invariant 9.1 (complétude du précache).** $A \subseteq \mathrm{dom}\,\mathcal{C}$ à l'issue de l'installation, ou l'installation **échoue** (atomicité : `event.waitUntil(cache.addAll(A))`).

> Un précache partiel est le pire des états : l'application semble installée puis échoue en salle, hors réseau, sans recours. `addAll` est tout-ou-rien ; ne jamais lui substituer une boucle de `add`.

**Invariant 9.2 (autarcie).** $\forall a \in A$, $a$ est servi depuis $\mathcal{C}$ sans requête réseau. Formellement, la stratégie est *cache-first* **strict** : aucun `fetch` de repli. Toute dépendance à un CDN externe viole l'exigence hors-ligne.

**Versionnage.** $\mathcal{C}_v$ pour la version $v$. À l'activation : $\forall v' < v,\ \mathcal{C}_{v'} := \emptyset$.

**Propriété 9.3 (nécessité).** Sans invalidation, $\mathcal{C}_{v'}$ persiste et sert indéfiniment la version périmée. Le versionnage est **la seule** condition de mise à jour d'une PWA en cache-first strict.

### 9.2 F4 — Permission caméra

$$\mathrm{perm} \in \{\texttt{granted}, \texttt{prompt}, \texttt{denied}\}$$

**Propriété 9.4 (dégradation).** $\mathrm{perm} = \texttt{denied} \implies$ le module C est inopérant, mais D (recherche + pointage manuel) reste **totalement fonctionnel** : $\mathrm{regM}$ ne dépend ni de $\delta$ ni de $\mathcal{I}$. Le système dégrade sans jamais tomber.

**Contrainte 9.5 (contexte sécurisé).** `getUserMedia` exige `https:` ou `localhost`. Sous `file:`, $\delta$ est inatteignable. C'est une contrainte de la plateforme, non du modèle.

**Contrainte 9.6 (déblocage audio iOS).** L'`AudioContext` doit être instancié dans le gestionnaire d'un événement d'interaction utilisateur. Formellement : $\varrho$ n'est définie qu'après un premier événement de classe `user-gesture`. D'où l'initialisation au clic sur « Démarrer le scan », jamais au chargement.

---

## 10. Complexité

| Algorithme | Temps | Espace |
|---|---|---|
| A1 $\mathrm{norm}$ | $O(|\nu|)$ | $O(|\nu|)$ |
| A2 $\iota$ | $O(N)$ | $O(N)$ |
| A3 $\kappa$ | $O(1)$ | $O(1)$ |
| A4 $\mathrm{qr}$ | $O(1)$ (version 1 fixe) | $O(1)$ |
| A5 $\mathrm{pos}$ | $O(1)$ / badge | $O(1)$ |
| C1 échantillonnage | $O(1)$ / trame | $O(|\mathcal{I}|)$ |
| C2 $\delta$ | $O(|\mathcal{I}'|) = O(|\mathcal{I}|/4)$ / trame | $O(|\mathcal{I}|)$ |
| C3 $\mathrm{err}$ | $O(1)$ | $O(1)$ |
| C4 $\mathrm{ret}$ | $O(1)$ amorti | $O(1)$ |
| C6 $\mathrm{reg}$ | $O(\log|K|)$ (B-arbre IndexedDB) | $O(1)$ |
| D4 $\mathrm{cancel}$ | $O(\log|K|)$ | $O(1)$ |
| B4 $\sqcup$ | $O(|K|) = O(96)$ | $O(|K|)$ |
| D2 $\mathrm{match}$ | $O(N \cdot |\hat\nu|)$ | $O(1)$ |
| E1 $\mu^*$ | $O(N \cdot |S|) = O(96)$ | $O(N\cdot|S|)$ |
| E2 stats | $O(N\cdot|S|)$ | $O(|S|)$ |
| E3 tri | $O(N \log N)$ | $O(N)$ |

**Propriété 10.1 (non-pertinence de l'optimisation).** Toutes les bornes hors C2 sont sur des ensembles de cardinal $\leq 96$. **Aucune optimisation algorithmique n'est justifiable.** La seule contrainte de performance réelle porte sur C2 (décodage temps réel), et sa cadence $f = 10\,\mathrm{Hz}$ est plafonnée pour des raisons **thermiques et énergétiques**, non de correction (§5).

> Corollaire d'ingénierie : toute complexité ajoutée au nom de la performance est un coût net. Écrire le code le plus simple qui satisfait les propriétés du §13.

---

## 11. Constantes de configuration

| Symbole | Valeur | Modifiable en salle | Référence |
|---|---|---|---|
| $N$ | 16 | non | §2.1 |
| $D$ | {2026-08-04, -05, -06} | non | §2.2 |
| $Z$ | `Africa/Douala` (UTC+1, sans DST) | non | §2.3 |
| $\alpha_{\text{m}}$ | 06:00 | **oui** | §2.3 |
| $\beta$ | 12:30 | **oui** | §2.3 |
| $\omega_{\text{s}}$ | 19:00 | **oui** | §2.3 |
| préfixe $\iota$ | `BIM26-` | non | §3.2 |
| $\sigma$ | constante de projet (**non secrète**) | non | §3.3 |
| $|\Xi|$ | $2^{10}$ (2 car. Base32) | non | §3.3 |
| séparateur | `-` | non | §3.4 |
| $\mathcal{E}$ | $Q$ (25 %) | non | §3.4 |
| $k$ | 8 badges/page | oui | §3.5 |
| $f$ | 10 Hz | non | §5 |
| $\Delta$ | 3 s | oui | §6.5 |
| $o$ | `auto` | **oui** | §6.4 |
| $\lambda$ | 15 mm | oui | §8.6 |
| $\phi$ | 8 pt | oui | §8.6 |

---

## 12. Versionnage du schéma

$\mathrm{ser}$ émet $(\text{version}, P, m)$. $\mathrm{des}$ rejette toute version inconnue plutôt que d'interpréter au mieux.

| Version | Changement |
|---|---|
| 1 | $m : K \rightharpoonup \mathbb{T} \times M$ — **sans tombstone**. Convergence fausse dès qu'une annulation existe. |
| **2** | $m : K \to V_\bot$, $V$ à génération et statut. Version courante. |

**Propriété 12.1 (migration).** $1 \to 2$ est possible : $(\tau,\mu) \mapsto (0, \textsc{Actif}, \tau, \mu, e_0)$. L'inverse ne l'est pas (perte des tombstones). Un état v1 fusionné avec un état v2 ressusciterait les enregistrements annulés — d'où le rejet strict par $\mathrm{des}$.

---

## 13. Propriétés à tester

| # | Propriété | Test |
|---|---|---|
| 2.1 | $\mathrm{loc}_Z$ bijective | 4–6 août : aucun instant local ambigu ni inexistant |
| 2.2 | $W(s)$ disjoints | $\forall s \neq s'$, intersection vide (15 paires) |
| 3.1 | $\mathrm{norm}$ idempotente sur $\mathcal{N}$ | `norm(norm(ν))==norm(ν)` pour les 16 noms |
| 3.2 | $\mathrm{Inj}(\iota)$ | $\lvert\iota(P)\rvert = 16$ |
| 3.3 | Détection $\geq 99{,}9\,\%$ | $10^4$ payloads de forme valide aléatoires → $< 20$ acceptés |
| 3.4 | Capacité QR | les 16 badges encodent en version 1-Q (21×21) |
| 4.1 | $\preceq_V$ total | $\rho$ injective sur 10³ valeurs aléatoires |
| 4.3 | $\sqcup$ demi-treillis | idempotence, commutativité, associativité sur triplets aléatoires |
| 4.4 | Convergence | 3 états, toutes les séquences de fusion → même résultat |
| 4.7 | Import préserve $m$ | ré-import après pointages → $m$ inchangé |
| 4.8 | Aller-retour | `des(ser(x)) == x` |
| 6.2 | $\kappa$ dans son domaine | `err("XXXX")` ne lève pas d'exception |
| 6.4 | Couverture des slots | $\forall s$, $\exists (t,o)$ atteignant $s$ |
| 6.5 | Anti-rebond | 20 détections en 2 s → 1 appel à `reg` |
| 6.7 | $\mathrm{reg}$ idempotente | double appel → état inchangé, 2ᵉ retour `DejaPointe` |
| 6.9 | Croissance | $m \preceq \mathrm{reg}(m,\dots)$ |
| 6.11 | **Non-résurrection** | `cancel` sur A, fusion avec B non informé → reste `Annulé` |
| 6.12 | **Re-pointage** | reg→cancel→reg, fusion → `Actif` |
| 7.1 | $\mathrm{Scan}$ totale | 5 branches couvertes, aucun cas non traité |
| 8.1 | $\mu^*$ totale | 96 cellules, 0 indéfinie |
| 8.2 | **Pas d'absence future** | $t_{\text{now}} = d_1 + 18\text{h}$ → 64 cellules `Vide`, 0 `Absent` sur $d_2,d_3$ |
| 8.3 | Tombstone transparent | pointage annulé → cellule `Absent`/`Vide`, jamais `Present` |
| 8.6 | Monotonie recherche | $\mathrm{match}(\texttt{"ndj"}) \supseteq \mathrm{match}(\texttt{"ndjo"})$ |
| 8.7 | Diacritiques | `match("stephane")` ∋ $p_{10}$ |
| 9.1 | Précache complet | mode avion après install → application fonctionnelle |
| 9.4 | Dégradation | caméra refusée → module D opérationnel |
| 12.1 | Rejet v1 | `des` sur un export v1 → `⊥`, pas de fusion |

**Priorité.** 6.11, 6.12, 8.2 et 9.1 sont les quatre tests dont l'échec est **silencieux en salle** et irrécupérable après coup. Les écrire en premier.

---

## Annexe — Exemple déroulé

Jour 1, appareil $e_1$. État initial $m_0 = \bot_\mathcal{M}$.

| # | Événement | Calcul | Résultat | $m(k)$ |
|---|---|---|---|---|
| 1 | Scan `BIM26-001-A7` à 08:42 | $\mathrm{err} = \textsc{Ok}$ ; $\varsigma^* = (d_1,\texttt{matin})$ | $\textsc{Ok}(\texttt{YEBGA Jacques Albert})$ | $(0,\textsc{Actif},\text{08:42},\texttt{scan},e_1)$ |
| 2 | Même badge, 08:42:01 (badge maintenu) | $\mathrm{ret} = \text{faux}$ | $\textsc{Rien}$ | inchangé |
| 3 | Même badge, 08:47 | $\mathrm{ret}$ = vrai ; garde 1 de $\mathrm{reg}$ | $\textsc{DejaPointe}(\text{08:42})$ | inchangé (Th. 6.7) |
| 4 | Ticket de caisse | $\mathrm{err} = \textsc{Format}$ | $\textsc{Format}$ | — |
| 5 | Erreur opérateur → annulation | $\mathrm{cancel}$ | — | $(1,\textsc{Annulé},\text{08:42},\texttt{scan},e_1)$ |
| 6 | Re-scan à 08:50 | $g^+ = 2$ | $\textsc{Ok}$ | $(2,\textsc{Actif},\text{08:50},\texttt{scan},e_1)$ |
| 7 | Fusion avec $e_2$ qui a $(0,\textsc{Actif},\text{08:41},\dots)$ | $\max_\rho$ : $g=2 > 0$ | — | $(2,\textsc{Actif},\text{08:50},\texttt{scan},e_1)$ |

**Lecture du pas 7.** Bien que $e_2$ détienne un $\tau$ **antérieur** (08:41 < 08:50), la génération domine : la règle « premier pointage gagne » ne s'applique qu'**à génération égale**. C'est voulu — l'annulation exprime une décision de l'opérateur, qui prime sur la chronologie brute.

**Rapport au pas 7**, si $t_{\text{now}} = d_1 + 18\text{h}$ :

$$\mu^*(p_1, (d_1,\texttt{matin})) = \textsc{Present}(\text{08:50}) \quad\Rightarrow\quad \text{cellule} = \texttt{P / 08h50}$$
$$\mu^*(p_1, (d_2,\texttt{matin})) = \textsc{Vide} \quad\text{car } t_{\text{now}} < \omega(d_2,\texttt{matin}) \quad\Rightarrow\quad \text{cellule vide}$$
$$\mu^*(p_2, (d_1,\texttt{matin})) = \textsc{Absent} \quad\text{car } t_{\text{now}} \geq \omega(d_1,\texttt{matin}) \quad\Rightarrow\quad \texttt{A}$$
$$S_\downarrow = \{(d_1,\texttt{matin}), (d_1,\texttt{midi})\},\quad \Theta = \frac{\mathrm{Pr}(d_1,\texttt{matin}) + \mathrm{Pr}(d_1,\texttt{midi})}{16 \times 2}$$

---

## Errata — corrections non intégrées

Le corps du document est **figé au 15/07/2026**. Les défauts ci-dessous sont connus et **non corrigés dans le texte**. Ils font foi en cas de contradiction, et sont traités dans `SPECIFICATIONS.md`, qui seul gouverne le code.

### Erratum 1 — Portée du Théorème 6.11 (non-résurrection)

Le théorème est énoncé sur $m_1 = \mathrm{cancel}(m,k)$ et $m_2 = m$ : deux états **de même base**. Il est vrai tel qu'écrit, mais **ne couvre pas les bases divergentes**, qui sont le cas opérationnel.

**Contre-exemple.** $e_1$ atteint $g{=}2$ (pointage → annulation → re-pointage). $e_2$, jamais fusionné, est à $(0, \textsc{Actif})$. Son opérateur annule → $(1, \textsc{Annulé})$. À la fusion, $\rho$ retient $g{=}2$ : **l'annulation d'$e_2$ est silencieusement perdue.**

Ce n'est pas une résurrection — 6.11 tient littéralement — mais une **perte d'opération**. Le Corollaire 4.4 reste vrai (la convergence est garantie), mais sa lecture d'ingénierie « correct sans ordre de messages » est **fausse pour `cancel`**. La convergence garantit que tous les appareils s'accordent, pas que toutes les intentions survivent.

**Traitement retenu** — précondition, plutôt qu'un vecteur de versions (surdimensionné pour 2 appareils) :

> **P-CANCEL.** `cancel` n'est autorisée que si aucune fusion n'est en attente. L'interface impose l'ordre *fusionner → annuler → fusionner*. À défaut, l'annulation peut être perdue et devra être refaite après fusion.

### Erratum 2 — L'Invariant 4.6 n'est pas un invariant d'état

Il porte sur $o_k$, « la valeur de l'override au moment de l'écriture ». Or $o \notin V$ : la donnée **n'est pas stockée**. L'invariant référence une information inobservable sur $m$, il est donc invérifiable. Symptôme révélateur : c'est le seul invariant absent du §13.

La v1.0 avait un invariant à exception ; en retirant l'exception, la v2.0 a créé un défaut d'observabilité.

**Traitement retenu** : $o$ est ajouté à $V$ dans l'implémentation (champ `override`), ce qui rend 4.6 vérifiable et testable.

### Erratum 3 — Comptes faux

- **Couverture** : l'en-tête initial annonçait « 25/25 ». L'inventaire réel compte **28** modules (A1–A5, B1–B4, C1–C7, D1–D4, E1–E4, F1–F4). **F3 — manifest et cycle d'installation — est absent** du document. Couverture réelle : **27/28**. F3 est spécifié dans `SPECIFICATIONS.md`.
- **Tests** : le §13 couvre 27 propriétés sur ~40 énoncées. Sans test : **3.5, 4.5, 4.6, 8.4, 8.5, 9.5, 9.6, 10.1**.

### Défauts mineurs, consignés et non bloquants

| § | Défaut | Traitement |
|---|---|---|
| 8.6 | La preuve invoque « $\mathrm{norm}$ opère caractère par caractère hors $\mathrm{squeeze}/\mathrm{trim}$ » — or ce sont précisément les composantes non locales, donc le cas à traiter. L'énoncé est **conjecturé**, non prouvé. | Vérification empirique sur les 16 noms |
| 7.2 | Seuls (1)→(2) et (4)→(5) sont contraints, et par **typage**. (2)→(3) et (3)→(4) sont des **choix d'ergonomie** présentés à tort comme des nécessités. | Reclassés en choix motivés |
| 8.10 | « ≈ 96 mm » et « ≈ 16 mm » sont des estimations à l'œil enchaînées par un $\Rightarrow$. La conclusion portrait/paysage n'est pas dérivée. | **À mesurer** sur le rendu réel |
| 3.3 | $\kappa$ ne détecte **pas** un badge d'un autre lot partageant $\sigma$ et le préfixe : seul le test $\in I$ sauve. | $\sigma$ dérivé du lot |

### Ce qui tient sans réserve

Le treillis §4.2–4.3 (l'ordre total rend les preuves triviales), le Théorème 6.7 (idempotence de `reg`), les Propriétés 8.1–8.2 (totalité de $\mu^*$, non-imputation d'absence future), la Propriété 6.4 (couverture des slots par l'override), la Propriété 3.4 (capacité QR version 1-Q).
