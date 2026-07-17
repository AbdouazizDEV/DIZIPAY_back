# Prompt — Front-end DiziPay (React + PWA) — Liens de paiement

> Copier-coller ce document dans un agent / développeur front.  
> Backend NestJS déjà livré : API `payment-links` opérationnelle.

---

## Rôle

Tu es un·e ingénieur·e front senior. Tu construis **l’application web DiziPay** en **React (TypeScript)**, architecturée selon les **principes SOLID**, **installable en PWA**, **100 % responsive** (mobile-first → desktop).

Objectif métier : permettre à un **marchand** de **générer un lien de paiement**, le **partager** à ses clients ; le **client** ouvre le lien et **paie** (QR PI-SPI affiché et/ou initiation via téléphone / QR wallet).

---

## Contexte produit

**DiziPay** orchestre des paiements via **PI-SPI (BCEAO)** en zone UEMOA (XOF).  
Le backend expose déjà l’API ; le front consomme uniquement cette API (pas de logique métier dupliquée côté client).

Compte de démo (seed) :

- Email : `merchant@dizipay.local`
- Mot de passe : `DizipayDev1!`

---

## Stack imposée

| Domaine | Choix |
|--------|--------|
| Framework | **React 18+** + **TypeScript** (strict) |
| Build | **Vite** |
| Routing | **React Router v6+** |
| Data fetching | **TanStack Query (React Query)** |
| Formulaires | **React Hook Form** + **Zod** |
| HTTP | Client HTTP dédié (fetch ou axios) encapsulé — jamais d’appels HTTP dans les composants UI |
| Styles | CSS Modules **ou** Tailwind — design tokens CSS variables |
| PWA | `vite-plugin-pwa` (Workbox) — installable, offline shell, cache assets |
| QR | Afficher le `svg` renvoyé par l’API **ou** encoder `qrPayload` (EMV) en QR côté client si besoin |
| Qualité | ESLint + Prettier ; structure de dossiers claire |

**Interdit** : logique métier PI-SPI dans le front ; secrets backend ; stocker le JWT en clair dans `localStorage` sans réflexion (préférer mémoire + refresh strategy simple, ou `sessionStorage` documenté).

---

## Principes SOLID (obligatoires)

Appliquer concrètement, pas en commentaire décoratif :

1. **S — Single Responsibility**  
   - Composants UI = présentation uniquement.  
   - Hooks / services = données & effets.  
   - Mappers = transformation DTO API → ViewModel.

2. **O — Open/Closed**  
   - Nouveaux moyens de paiement / écrans via extension (stratégies, slots), sans modifier le cœur Auth / Layout.

3. **L — Liskov**  
   - Interfaces stables pour les repositories (`IPaymentLinkRepository`, `IAuthRepository`) ; implémentations HTTP interchangeables (mock / réel).

4. **I — Interface Segregation**  
   - Pas de « god context » : AuthContext, PaymentLinkContext séparés ; props / hooks fins.

5. **D — Dependency Inversion**  
   - Les pages dépendent d’abstractions (hooks/repos), pas d’URL hardcodées.  
   - Injection via modules (`src/infrastructure/api`, `src/domain`, `src/application`).

### Architecture de dossiers cible

```text
src/
  domain/                 # types métier purs (PaymentLink, MerchantSession…)
  application/            # use-cases / hooks métier (createPaymentLink, getPublicLink…)
  infrastructure/         # HTTP client, repositories, storage, PWA helpers
  presentation/           # pages, composants, layouts, routes
  shared/                 # UI kit, utils, design tokens
```

---

## Configuration environnement

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_APP_NAME=DiziPay
```

Le backend construit déjà `url` avec `PAYMENT_LINK_PUBLIC_BASE_URL` (ex. `http://localhost:5173/pay/{token}`).  
Le front **doit** exposer la route `/pay/:token` pour coller à cette URL.

CORS : s’assurer que l’origine Vite est autorisée côté API (`CORS_ORIGIN`) si une liste stricte est utilisée.

---

## Contrat API backend (source de vérité)

Base : `{VITE_API_BASE_URL}`  
Auth marchand : header `Authorization: Bearer {access_token}`

### Auth

`POST /auth/login`

```json
{ "email": "merchant@dizipay.local", "password": "DizipayDev1!" }
```

Réponse :

```json
{
  "access_token": "<jwt>",
  "token_type": "Bearer",
  "merchantId": "<uuid>"
}
```

### Liens de paiement (marchand — JWT)

**Créer** — `POST /payment-links` → **201**

```json
{
  "amount": 150000,
  "description": "Consultation pharmacie",
  "expiresInMinutes": 1440,
  "includeSvg": true
}
```

- `amount` : **centimes XOF** (150000 = 1 500 XOF)  
- Réponse typique : `id`, `token`, `url`, `amount`, `currency`, `description`, `status`, `expiresAt`, `transactionId`, `qrPayload`, `svg`, `createdAt`

**Lister** — `GET /payment-links`  
**Annuler** — `POST /payment-links/:token/cancel`

Statuts lien : `ACTIVE` | `PAID` | `EXPIRED` | `CANCELLED`

### Liens de paiement (public — sans JWT)

**Détail page client** — `GET /payment-links/:token`  
→ `merchantName`, `amount`, `currency`, `description`, `status`, `expiresAt`, `qrPayload`, `svg`, `url`, `instructions`

**Statut (polling)** — `GET /payment-links/:token/status`  
→ `status`, `transactionStatus`, `amount`, `paidAt`

**Payer via wallet client** — `POST /payment-links/:token/pay`

```json
{
  "clientPhone": "+221771234567"
}
```

ou `{ "qrCode": "..." }` ou `{ "clientAlias": "..." }`  
(au moins un des trois)

---

## Parcours UX à implémenter

### A. Espace marchand (authentifié)

1. **Login** (`/login`)
2. **Dashboard** (`/`) — résumé : nombre de liens ACTIVE / PAID (dérivé de la liste)
3. **Créer un lien** (`/links/new`) — montant (saisie utilisateur en XOF convertie en centimes), description, durée
4. **Succès création** — afficher lien + bouton **Copier** + **Partager** (Web Share API si dispo) + QR
5. **Mes liens** (`/links`) — liste, filtres statut, actions : copier, ouvrir, annuler, voir statut
6. **Détail lien** (`/links/:token`) — statut live (poll 3–5 s tant que ACTIVE)

### B. Page publique client (PWA)

7. **Payer** (`/pay/:token`) — **sans login**
   - Afficher marchand, montant formaté XOF, description, expiration
   - Afficher QR (`svg` ou rendu depuis `qrPayload`)
   - Option secondaire : formulaire téléphone → `POST .../pay`
   - Polling `.../status` jusqu’à `PAID` / `EXPIRED` / `CANCELLED`
   - États UI clairs : en attente, succès, expiré, annulé, erreur réseau

### C. Shell applicatif

- Layout responsive (nav bottom mobile / sidebar desktop pour zone marchand)
- Gestion erreurs API (401 → login, 404 lien, 400 message métier)
- Toasts / feedback accessibles
- Empty states

---

## Responsive (complet)

- **Mobile-first** (320px+)
- Breakpoints cohérents (sm / md / lg)
- Page `/pay/:token` optimisée **une main** (QR bien lisible, CTA larges)
- Pas de scroll horizontal
- Touch targets ≥ 44px
- Clavier virtuel : inputs `type="tel"` pour téléphone
- Test cible : iPhone SE, Android moyen, tablette, desktop 1280+

---

## PWA (obligatoire)

- Manifest : nom **DiziPay**, short_name, theme/background color, `display: standalone`, icônes 192 & 512
- Service worker : précache shell ; network-first pour API
- Offline : page `/pay/:token` déjà visitée peut montrer un fallback « hors ligne — reconnectez-vous pour le statut »
- Bannière / bouton « Installer l’app » (avant-install prompt)
- `apple-mobile-web-app-capable` et meta theme-color

---

## Design UI (contraintes)

- Identité **fintech Afrique de l’Ouest / confiance** : sobre, lisible, montants très visibles
- **Une composition** par viewport (pas un dashboard surchargé sur la page publique)
- Typographie distinctive (pas Inter / Roboto / Arial par défaut)
- Fond non plat uniquement (léger grain / dégradé discret) — éviter le cliché « purple gradient AI »
- Page publique `/pay/:token` : brand DiziPay discret + montant hero + QR + une phrase + CTA
- Accessibilité : contrastes WCAG AA, focus visibles, labels

---

## Qualité & tests

- Types stricts alignés sur les DTO API
- Formatage montants : `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' })` en tenant compte que l’API parle en **centimes** (diviser par 100 **ou** documenter clairement si vous traitez amount comme unités — **le backend actuel utilise des centimes** ; rester cohérent)
- Tests unitaires des mappers montant + au moins un test hook/repository mocké
- README : scripts `dev` / `build` / `preview`, variables d’env, flux de démo

---

## Critères d’acceptation

- [ ] Login marchand + JWT utilisé sur les routes protégées  
- [ ] Création lien → URL `/pay/{token}` fonctionnelle  
- [ ] Copier / partager le lien  
- [ ] Liste + annulation  
- [ ] Page publique : QR + montant + statut live  
- [ ] Paiement optionnel via téléphone (`/pay`)  
- [ ] PWA installable (Chrome/Android)  
- [ ] Responsive validé mobile / desktop  
- [ ] Architecture SOLID respectée (dossiers domain / application / infrastructure / presentation)  
- [ ] Aucun secret backend dans le repo front  

---

## Hors scope (ne pas faire maintenant)

- Back-office admin global  
- Comptabilité / exports Excel  
- Refonte de l’API Nest  
- App native (Expo) — sauf si réutilisation future des mêmes use-cases

---

## Livrable attendu

1. Projet Vite React TS complet et lançable (`npm i && npm run dev`)  
2. README + `.env.example`  
3. PWA build de prod (`npm run build` + preview)  
4. Court paragraphe « comment tester avec le backend local sur :3000 »

Commence par scaffolder l’architecture SOLID + auth + page `/pay/:token`, puis l’espace marchand.
