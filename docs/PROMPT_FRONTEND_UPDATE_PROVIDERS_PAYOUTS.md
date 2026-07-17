# Prompt Cursor — Mise à jour Front-end DiziPay Website

> **À coller dans Cursor** ouvert sur le projet  
> `/home/abdou-aziz/Documents/Contrat DIGIGROUP/DiziPay/DiziPay Website`  
>
> Objectif : **mettre à jour** l’app existante (pas de rebuild), pour l’aligner avec le backend NestJS actuel, **en conservant strictement le style UI et l’architecture déjà en place**.

---

## Rôle

Tu es un·e ingénieur·e front senior. Tu travailles sur **DiziPay Website** (React + Vite + PWA), déjà livré avec :

- Architecture SOLID (`domain` / `application` / `infrastructure` / `presentation` / `shared`)
- Design system actuel (tokens CSS, Nunito, vert forest/mint)
- Flux marchand : login, dashboard, création / liste / détail de liens
- Page publique `/pay/:token`

Tu dois **étendre** ce projet pour consommer les **nouvelles APIs backend** (choix du mode de paiement PSPI/Wave, virements/payouts), **sans changer l’identité visuelle**.

---

## Règle d’or — NE PAS casser le style actuel

### Interdit

- Introduire Tailwind, shadcn, MUI, Chakra, ou toute lib UI externe
- Changer la typo (garder **Nunito**)
- Changer la palette (`#00403f`, `#40c080`, `#f4faf7`, etc.)
- Refondre les layouts (`MerchantLayout`, bottom nav, sidebar)
- Réécrire les pages existantes « from scratch »
- Déplacer les appels HTTP hors de `infrastructure/`
- Stocker le JWT en `localStorage` (rester sur `sessionStorage`)

### Obligatoire — réutiliser

| Élément | Fichier de référence |
|--------|----------------------|
| Tokens / global | `src/shared/styles/tokens.css` |
| Boutons, champs, badges | `src/shared/ui/*` |
| Layout marchand | `src/presentation/layouts/MerchantLayout*` |
| Patterns cartes / kicker / h1 / lead | pages existantes (`CreateLinkPage`, `PublicPayPage`, `LoginPage`) |
| Chips / presets | style des presets durée sur `CreateLinkPage` |
| Money (XOF ↔ centimes) | `src/shared/utils/money.ts` |
| DI repos | `src/infrastructure/repositories/container.ts` |

### Look & feel à préserver

- Cartes : `border-radius: var(--radius-xl)`, `box-shadow: var(--shadow-lift)`, fond blanc semi-opaque
- CTA : boutons **pill** (`border-radius: 999px`), gradient mint sur primary
- Fond : dégradés radiaux forest/mint + grain (déjà dans `tokens.css`)
- Touch targets ≥ 48px (`--touch`)
- Copy **français**, montants formatés `fr-FR` / XOF
- Mobile-first + PWA inchangés

---

## Contexte backend (source de vérité)

API : `{VITE_API_BASE_URL}` — défaut `http://localhost:3000/api/v1`  
Prod typique : `https://dizipay-api.onrender.com/api/v1`

Compte démo :

- Email : `merchant@dizipay.local`
- Mot de passe : `DizipayDev1!`

### Nouveautés API à intégrer

#### 1. Liste des modes de paiement (public)

`GET /payment-providers`

```json
{
  "providers": [
    {
      "type": "PSPI",
      "label": "PI-SPI (interopérable UEMOA)",
      "available": true
    },
    {
      "type": "WAVE",
      "label": "Wave",
      "available": false,
      "reason": "Le fournisseur Wave n'est pas encore disponible."
    }
  ]
}
```

#### 2. Paiement via lien — champ `paymentProvider`

`POST /payment-links/:token/pay` (public)

```json
{
  "paymentProvider": "PSPI",
  "clientPhone": "+221771234567"
}
```

- `paymentProvider` : `"PSPI" | "WAVE"` (optionnel, **défaut PSPI** côté API)
- Au moins un de : `clientPhone` | `qrCode` | `clientAlias`
- Si Wave indisponible → **HTTP 503** avec message explicite  
  (`PaymentProviderUnavailableError`) → afficher le message métier, ne pas crasher

#### 3. Virements sortants (marchand JWT)

`POST /payouts`

**Mobile money :**

```json
{
  "accountType": "MOBILE_MONEY",
  "debitAccount": "10188672388920614979",
  "pispiAccountId": "10188672388920614979",
  "holderName": "Amadou Diop",
  "phoneNumber": "+221771234567",
  "amount": 5000,
  "currency": "XOF",
  "reference": "OUT-MM-001234",
  "description": "Virement client"
}
```

**Compte bancaire :**

```json
{
  "accountType": "BANK_ACCOUNT",
  "debitAccount": "10188672388920614979",
  "iban": "FR76 3000 6000 0112 3456 7890 189",
  "holderName": "Société SA",
  "bic": "BNPAFRPP",
  "countryCode": "FR",
  "amount": 25000,
  "reference": "OUT-BANK-001234"
}
```

- `amount` : **centimes XOF** (comme les payment-links)
- `reference` : string ≥ 8 caractères, unique côté métier
- Erreurs domaine : `400` + `PayoutAccountValidationError` (IBAN invalide, etc.)
- Échec PSPI sandbox possible (`500`) → message utilisateur clair

`GET /payouts/:providerPayoutId/status` (JWT) — optionnel pour polling

#### 4. (Optionnel MVP+) Initiation générique JWT

`POST /payment-providers/initiate` — pas prioritaire si le flux public `/pay/:token` couvre le besoin.  
Ne l’ajoute que si tu as du temps après les items 1–3.

---

## Ce qui existe déjà (ne pas recréer)

| Feature | Statut |
|---------|--------|
| Login JWT + ProtectedRoute | OK |
| Dashboard / CreateLink / LinksList / LinkDetail | OK |
| PublicPay (QR + téléphone + polling 4s) | OK — **à étendre** |
| HttpAuthRepository / HttpPaymentLinkRepository | OK — **à étendre** |
| PWA + MerchantLayout | OK |

---

## Travaux à réaliser (par priorité)

### P0 — Choix du mode de paiement sur `/pay/:token`

1. **Domain**
   - Ajouter `PaymentProviderType = 'PSPI' | 'WAVE'`
   - Étendre `PayPaymentLinkInput` avec `paymentProvider?: PaymentProviderType`
   - Types pour la réponse `GET /payment-providers`

2. **Infrastructure**
   - Nouveau `IPaymentProviderRepository` + `HttpPaymentProviderRepository`
   - Méthode `listProviders(): Promise<PaymentProvider[]>`
   - Enregistrer dans `container.ts`
   - Étendre `HttpPaymentLinkRepository.pay(...)` pour envoyer `paymentProvider`

3. **Application**
   - Hook `usePaymentProviders()` (React Query, cache raisonnable)
   - Mapper DTO → ViewModel (`available`, `label`, `reason`)

4. **Presentation — `PublicPayPage`**
   - Avant l’initiation (téléphone / alias), ajouter une étape visuelle :
     - Titre type kicker : « Mode de paiement »
     - **Chips / cartes sélectionnables** (même language visuel que les presets de durée sur CreateLink)
     - Provider `available: false` → désactivé + raison affichée (Wave)
     - Provider sélectionné mis en avant (bordure mint / fond soft)
   - Envoyer `paymentProvider` dans `POST .../pay`
   - Gérer **503** : toast / bandeau d’erreur avec le message API
   - Ne pas casser : QR PI-SPI, polling statut, états PAID / EXPIRED / CANCELLED, offline banner

### P1 — Espace marchand : Virements (`/payouts`)

1. **Domain** : `PayoutAccountType`, commandes MOBILE_MONEY / BANK_ACCOUNT, résultat payout
2. **Infrastructure** : `IPayoutRepository` + `HttpPayoutRepository` (`POST /payouts`, optionnel status)
3. **Application** : hook `useCreatePayout` + schema Zod (discriminated union sur `accountType`)
4. **Presentation**
   - Route protégée `/payouts/new` (et éventuellement `/payouts` liste minimale si simple)
   - Page formulaire :
     - Switch / chips `MOBILE_MONEY` | `BANK_ACCOUNT`
     - Champs conditionnels (même `Field` / `TextInput` existants)
     - Montant saisi en XOF → conversion centimes
     - `reference` auto-générée (ex. `OUT-{timestamp}`) éditable
     - `debitAccount` : pour le MVP, champ texte prérempli possible avec valeur seed `10188672388920614979` + aide contextuelle
   - Ajouter un item de nav dans `MerchantLayout` : **« Virement »** (icône cohérente avec les 3 items existants ; bottom nav + sidebar)
   - Succès / erreur : feedback dans le style actuel (pas de modal système brut)

### P2 — Polish & résilience

- Messages d’erreur API unifiés (`ApiError`) pour 400 / 503 / 500
- Empty states si liste providers vide
- Tests Vitest : mapper providers + schema Zod payout (MOBILE vs BANK)
- Mettre à jour `README.md` (nouveaux flux + variables d’env)

---

## Architecture à respecter (SOLID)

```text
src/
  domain/                 # types + interfaces repo (étendre, ne pas casser)
  application/            # hooks + mappers
  infrastructure/         # HTTP repos uniquement
  presentation/           # pages / layouts / composants d’écran
  shared/                 # ui kit + tokens + utils
```

- **S** : UI ≠ HTTP ≠ validation Zod métier  
- **O** : nouveau provider = nouvelle entrée API + chip, sans réécrire PublicPay entier  
- **L** : repos derrière interfaces (`IPaymentProviderRepository`, `IPayoutRepository`)  
- **I** : pas de god-context  
- **D** : pages → hooks → repos (container DI)

---

## UX attendue (détail)

### Page publique `/pay/:token` (composition unique)

Ordre vertical mobile :

1. Brand discret + nom marchand  
2. Montant hero (très lisible)  
3. Description + expiration  
4. **Choix du mode** (chips PSPI / Wave)  
5. QR PI-SPI (inchangé)  
6. Ou « Payer avec mon numéro » (téléphone)  
7. Statut live (polling)

Wave désactivé = chip grisée + texte `reason`, pas de CTA trompeur.

### Page virement marchand

- Même structure kicker / h1 / lead que CreateLink  
- Une carte formulaire, pas un dashboard  
- CTA unique « Initier le virement »  
- Responsive : une colonne mobile

---

## Critères d’acceptation

- [ ] `GET /payment-providers` consommé ; chips sur `/pay/:token`
- [ ] `POST /payment-links/:token/pay` envoie `paymentProvider`
- [ ] Wave indisponible → UI désactivée + 503 géré proprement
- [ ] Page `/payouts/new` + entrée nav marchand
- [ ] Formulaire MOBILE_MONEY / BANK_ACCOUNT validé Zod
- [ ] Aucune régression visuelle (Nunito, mint/forest, pills, layout)
- [ ] Aucune lib UI ajoutée
- [ ] Architecture SOLID préservée
- [ ] `npm run build` OK ; PWA intacte
- [ ] README mis à jour

---

## Hors scope

- Refonte graphique / rebranding  
- Admin, exports Excel, comptabilité  
- Brancher un vrai SDK Wave (attendre backend)  
- Modifier le backend NestJS  
- App native Expo

---

## Ordre de travail recommandé

1. Types domain + repo providers + hook  
2. UI chips sur `PublicPayPage` + payload `paymentProvider`  
3. Gestion erreurs 503  
4. Domain/repo/hooks payouts  
5. Page `/payouts/new` + nav  
6. Tests + README  

Commence par lire `tokens.css`, `PublicPayPage.tsx`, `CreateLinkPage.tsx`, `HttpPaymentLinkRepository.ts` et `container.ts`, puis implémente P0 sans toucher au look.
