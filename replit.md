# PharmaFlow - Gestion des Commandes Pharmaceutiques

## Overview
PharmaFlow est un syst\u00e8me complet de gestion des commandes pharmaceutiques permettant la tra\u00e7abilit\u00e9 des commandes entre laboratoires, d\u00e9l\u00e9gu\u00e9s, grossistes et pharmacies.

## Core Features
- **Authentification & Contr\u00f4le d'acc\u00e8s** : Syst\u00e8me de r\u00f4les strict (admin, laboratoire, d\u00e9l\u00e9gu\u00e9, grossiste, pharmacie)
- **Gestion des commandes** : Workflow complet avec transitions de statuts valid\u00e9es
- **Catalogue produits** : Gestion des produits par laboratoire
- **Audit trail** : Historique immuable de toutes les actions
- **Notifications** : Alertes in-app pour les changements de statut
- **Dashboards** : Tableaux de bord adapt\u00e9s \u00e0 chaque r\u00f4le

## User Roles
| R\u00f4le | Acc\u00e8s |
|------|-------|
| Admin | Acc\u00e8s global \u00e0 toutes les fonctionnalit\u00e9s |
| Laboratoire | Acc\u00e8s aux commandes et produits de son labo |
| D\u00e9l\u00e9gu\u00e9 | Acc\u00e8s uniquement \u00e0 ses propres commandes |
| Grossiste | Acc\u00e8s aux commandes qui lui sont attribu\u00e9es |
| Pharmacie | Lecture + confirmation de livraison uniquement |

## Test Credentials
- **Admin**: admin@pharmaflow.com / admin123
- **D\u00e9l\u00e9gu\u00e9**: delegue@pharmaflow.com / delegue123
- **Grossiste**: grossiste@pharmaflow.com / grossiste123
- **Pharmacie**: pharmacie@pharmaflow.com / pharmacie123
- **Laboratoire**: labo@pharmaflow.com / labo123

## Order Status Workflow
```
Brouillon \u2192 Envoy\u00e9e (D\u00e9l\u00e9gu\u00e9)
Envoy\u00e9e \u2192 Accept\u00e9e / Refus\u00e9e / Partiellement accept\u00e9e (Grossiste)
Accept\u00e9e \u2192 En pr\u00e9paration (Grossiste)
En pr\u00e9paration \u2192 Livr\u00e9e (Grossiste)
Livr\u00e9e \u2192 Cl\u00f4tur\u00e9e (Pharmacie)
* Litige peut \u00eatre d\u00e9clench\u00e9 par la Pharmacie \u00e0 tout moment
```

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui components
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **State**: TanStack Query (React Query)
- **Routing**: Wouter

## Project Structure
```
client/
  src/
    components/     # Composants r\u00e9utilisables
    pages/          # Pages de l'application
    lib/            # Utilitaires (auth, queryClient)
    hooks/          # Custom hooks
server/
  index.ts          # Point d'entr\u00e9e serveur
  routes.ts         # API REST routes
  storage.ts        # Couche d'acc\u00e8s aux donn\u00e9es
  db.ts             # Configuration base de donn\u00e9es
  seed.ts           # Donn\u00e9es initiales
shared/
  schema.ts         # Sch\u00e9mas Drizzle + types TypeScript
```

## API Routes
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Utilisateur courant
- `POST /api/auth/logout` - D\u00e9connexion
- `GET /api/users` - Liste utilisateurs (admin)
- `POST /api/users` - Cr\u00e9er utilisateur (admin)
- `PATCH /api/users/:id` - Modifier utilisateur (admin)
- `GET /api/entities` - Liste entit\u00e9s
- `POST /api/entities` - Cr\u00e9er entit\u00e9 (admin)
- `GET /api/products` - Liste produits
- `POST /api/products` - Cr\u00e9er produit (admin/labo)
- `GET /api/orders` - Liste commandes (filtr\u00e9e par r\u00f4le)
- `POST /api/orders` - Cr\u00e9er commande (d\u00e9l\u00e9gu\u00e9)
- `PATCH /api/orders/:id/status` - Changer statut
- `GET /api/notifications` - Notifications utilisateur
- `GET /api/dashboard/stats` - Statistiques dashboard
- `GET /api/history` - Historique audit (admin)

## Development
```bash
npm run dev       # D\u00e9marrer le serveur de d\u00e9veloppement
npm run db:push   # Appliquer les migrations
```

## Recent Changes
- 2026-02-05: Version initiale avec toutes les fonctionnalit\u00e9s MVP
  - Authentification et gestion des sessions
  - CRUD complet pour utilisateurs, entit\u00e9s, produits
  - Workflow de commandes avec transitions valid\u00e9es
  - Audit trail complet et immuable
  - Notifications in-app
  - Dashboards par r\u00f4le
  - Donn\u00e9es de test pr\u00e9charg\u00e9es
