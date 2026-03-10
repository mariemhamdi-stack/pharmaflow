# PharmaFlow - Gestion des Commandes Pharmaceutiques

## Overview
PharmaFlow est un systeme complet de gestion des commandes pharmaceutiques permettant la tracabilite des commandes entre laboratoires, delegues, grossistes et pharmacies. Le systeme integre un workflow de double validation (delegue + pharmacie), des offres commerciales, des actions marketing laboratoire et des communications in-app.

## Core Features
- **Authentification & Controle d'acces** : Systeme de roles strict (admin, laboratoire, delegue, grossiste, pharmacie)
- **Double validation commandes** : Workflow delegue valide -> pharmacie valide -> envoi auto au grossiste
- **Reattribution de commandes** : Apres refus grossiste, le delegue peut reattribuer a un autre grossiste
- **Offres commerciales** : Remises, packs promotionnels, mises en place (negociees par delegues)
- **Actions marketing** : Actions commerciales initiees par les laboratoires (globales ou ciblees)
- **Communications in-app** : Bannieres, pop-ups, actualites par laboratoire
- **Blocage d'entites** : Le laboratoire peut bloquer grossiste/pharmacie/delegue
- **Audit trail** : Historique immuable de toutes les actions
- **Notifications** : Alertes in-app et email pour les changements de statut
- **Dashboards** : Tableaux de bord adaptes a chaque role

## User Roles
| Role | Acces |
|------|-------|
| Admin | Acces global a toutes les fonctionnalites |
| Laboratoire | Commandes, produits, offres, actions, communications de son labo |
| Delegue | Ses propres commandes, produits, offres |
| Grossiste | Commandes qui lui sont attribuees |
| Pharmacie | Validation commandes + confirmation livraison + litige |

## Test Credentials
- **Admin**: admin@pharmaflow.com / admin123
- **Delegue**: delegue@pharmaflow.com / delegue123
- **Grossiste**: grossiste@pharmaflow.com / grossiste123
- **Pharmacie**: pharmacie@pharmaflow.com / pharmacie123
- **Laboratoire**: labo@pharmaflow.com / labo123

## Order Status Workflow (Double Validation)
```
Brouillon -> Validee delegue (Delegue valide)
Validee delegue -> Validee pharmacie (Pharmacie valide) OU retour Brouillon (Pharmacie refuse)
Validee pharmacie -> Envoyee (Automatique)
Envoyee -> Acceptee / Refusee / Partiellement acceptee (Grossiste)
Refusee -> Reattribution a un autre grossiste OU Annulee (Delegue)
Acceptee -> En preparation (Grossiste)
En preparation -> Livree (Grossiste)
Livree -> Cloturee OU Litige (Pharmacie)
* Litige uniquement apres livraison
* Motif de refus obligatoire pour le grossiste
```

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui components
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **State**: TanStack Query (React Query)
- **Routing**: Wouter
- **Email**: Resend API

## Project Structure
```
client/
  src/
    components/     # Composants reutilisables
    pages/          # Pages de l'application
      dashboard.tsx # Tableaux de bord par role
      orders.tsx    # Gestion commandes (double validation, reassignment)
      offers.tsx    # Offres commerciales
      actions.tsx   # Actions marketing laboratoire
      communications.tsx # Communications in-app
      products.tsx  # Catalogue produits
      users.tsx     # Gestion utilisateurs (admin)
      entities.tsx  # Gestion entites (admin)
      notifications.tsx # Centre de notifications
      history.tsx   # Historique audit
      stats.tsx     # Statistiques
    lib/            # Utilitaires (auth, queryClient)
    hooks/          # Custom hooks
server/
  index.ts          # Point d'entree serveur
  routes.ts         # API REST routes
  storage.ts        # Couche d'acces aux donnees
  db.ts             # Configuration base de donnees
  seed.ts           # Donnees initiales
  email.ts          # Templates et envoi d'emails
shared/
  schema.ts         # Schemas Drizzle + types TypeScript
```

## API Routes
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Utilisateur courant
- `POST /api/auth/logout` - Deconnexion
- `GET /api/users` - Liste utilisateurs (admin)
- `POST /api/users` - Creer utilisateur (admin)
- `PATCH /api/users/:id` - Modifier utilisateur (admin)
- `PATCH /api/users/:id/block` - Bloquer/debloquer utilisateur (admin/labo)
- `GET /api/entities` - Liste entites
- `POST /api/entities` - Creer entite (admin)
- `PATCH /api/entities/:id` - Modifier entite
- `PATCH /api/entities/:id/block` - Bloquer/debloquer entite (admin/labo)
- `GET /api/products` - Liste produits
- `POST /api/products` - Creer produit (admin/labo)
- `PATCH /api/products/:id` - Modifier produit
- `GET /api/orders` - Liste commandes (filtree par role)
- `GET /api/orders/:id` - Detail commande
- `POST /api/orders` - Creer commande (delegue)
- `PATCH /api/orders/:id/status` - Changer statut (double validation)
- `PATCH /api/orders/:id/reassign` - Reattribuer grossiste (delegue, apres refus)
- `PATCH /api/orders/:id/cancel` - Annuler commande (delegue)
- `GET /api/offers` - Liste offres commerciales
- `POST /api/offers` - Creer offre
- `PATCH /api/offers/:id` - Modifier offre
- `GET /api/actions` - Liste actions commerciales
- `POST /api/actions` - Creer action (labo)
- `PATCH /api/actions/:id` - Modifier action
- `GET /api/communications` - Liste communications
- `POST /api/communications` - Creer communication (labo)
- `PATCH /api/communications/:id` - Modifier communication
- `POST /api/communications/:id/view` - Tracker vue
- `GET /api/notifications` - Notifications utilisateur
- `PATCH /api/notifications/:id/read` - Marquer comme lue
- `POST /api/notifications/mark-all-read` - Marquer toutes comme lues
- `GET /api/dashboard/stats` - Statistiques dashboard
- `GET /api/stats` - Statistiques detaillees
- `GET /api/history` - Historique audit (admin)

## Development
```bash
npm run dev       # Demarrer le serveur de developpement
npm run db:push   # Appliquer les migrations
```

## Recent Changes
- 2026-03-10: Page d'accueil initiale avec sélection de rôle
  - Nouvelle page home.tsx affichant 4 rôles (Laboratoire, Délégué, Grossiste, Pharmacie) — admin exclu
  - Clic sur un rôle redirige vers /login
  - Bouton "Retour" sur la page de connexion pour revenir à l'accueil
  - Routing mis à jour : utilisateurs non connectés voient la page d'accueil par défaut, /login pour le formulaire
  - Suppression des comptes de test et du placeholder email sur la page de connexion
- 2026-02-19: Ajout champs et filtres + import fichier
  - Produits : ajout champ "spécialité" dans le formulaire, la table et la recherche
  - Pharmacies : ajout champs "région" et "secteur", filtres par région/secteur/classe
  - Grossistes : ajout champs "région" et "secteur", filtres par région/secteur
  - Import fichier CSV pour pharmacies et grossistes (POST /api/entities/import)
  - Schema entities : nouveaux champs region, secteur
  - Schema products : nouveau champ specialite
- 2026-02-18: Séparation pharmacies et grossistes
  - Page "Liste de pharmacies" filtre uniquement les pharmacies
  - Nouveaux champs pharmacie : classification, propriétaire, pharmacien responsable, préparateurs (multiples)
  - Nouvelle page "Liste de grossistes" dédiée aux grossistes
  - Navigation mise à jour avec icônes distinctes (Store/Truck)
  - Corrections accents français dans toute l'application
- 2026-02-10: Mise a jour majeure
  - Double validation: delegue valide puis pharmacie valide avant envoi au grossiste
  - Reattribution de commandes apres refus grossiste
  - Annulation de commandes (brouillon ou apres refus)
  - Motif de refus obligatoire pour le grossiste
  - Litige strictement apres livraison uniquement
  - Offres commerciales (remises, packs, mises en place)
  - Actions marketing laboratoire (globales/ciblees)
  - Communications in-app (bannieres, pop-ups, actualites)
  - Blocage d'entites et utilisateurs par le laboratoire
  - Nouveaux statuts: validee_delegue, validee_pharmacie, annulee
  - Dashboards mis a jour avec nouveaux statuts
  - Templates email mis a jour
- 2026-02-05: Version initiale avec toutes les fonctionnalites MVP
