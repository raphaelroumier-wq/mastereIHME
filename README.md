# VéloLoc

Application de démonstration de réservation de vélos réalisée avec React, Express et PostgreSQL dans le cadre d’un cours.

## Fonctionnalités

- Catalogue de vélos issu de PostgreSQL, recherche par nom et filtres par catégorie et budget.
- Création de compte et connexion avec mots de passe hachés via `scrypt`.
- Session conservée dans un cookie HTTP-only, SameSite=Lax, d’une durée de sept jours.
- Consultation des créneaux libres par vélo et par date, de 9 h à 18 h.
- Réservation par heures pleines, pour une durée d’une heure minimum.
- Prévention des conflits de réservation côté serveur, y compris lorsque plusieurs demandes arrivent simultanément.
- Calcul du prix au prorata d’un tarif journalier de neuf heures.
- Espace personnel pour consulter et annuler ses réservations futures.

Le projet ne traite pas de paiement, de récupération de mot de passe ni de vérification d’adresse email. Il s’agit d’un projet pédagogique, pas d’un service prêt pour la production.

## Prérequis

- Node.js 20.19+ ou 22.12+.
- Docker et Docker Compose.
- npm.

## Lancement en local

1. Démarrer PostgreSQL depuis la racine du dépôt :

   ```powershell
   docker compose up -d db
   ```

2. Créer `backend/.env` avec l’URL de connexion PostgreSQL. Pour la configuration locale du fichier `compose.yaml` :

   ```dotenv
   DATABASE_URL=postgresql://app:dev_password@localhost:5432/reservation_velos
   PORT=3000
   ```

   Ces identifiants sont réservés au développement local. Utilisez des identifiants distincts et des secrets protégés dans tout environnement partagé ou déployé. Le fichier `.env` ne doit pas être ajouté à Git.

3. Installer et lancer l’API dans un terminal :

   ```powershell
   cd backend
   npm install
   npm start
   ```

   Au démarrage, le serveur applique `backend/schema.sql` et ajoute les vélos de démonstration s’ils ne sont pas déjà présents. L’API écoute sur `http://localhost:3000`.

4. Installer et lancer l’interface dans un deuxième terminal :

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

   Ouvrez l’adresse indiquée par Vite, généralement `http://localhost:5173`. Le proxy Vite transmet les requêtes `/api` à Express.

Sous Windows, utilisez `npm.cmd` à la place de `npm` si la stratégie PowerShell bloque les scripts npm.

## API

Les données sont échangées en JSON. Les erreurs sont renvoyées dans la propriété `erreur`.

| Méthode | Route | Accès | Rôle |
|---|---|---|---|
| `GET` | `/api/velos` | Public | Liste les vélos ; accepte `type` et `budget` en paramètres de requête |
| `GET` | `/api/velos/:id/disponibilites?date=AAAA-MM-JJ` | Public | Renvoie les créneaux horaires et leur disponibilité |
| `POST` | `/api/inscription` | Public | Crée un compte (`nom`, `email`, `motDePasse`) et ouvre une session |
| `POST` | `/api/connexion` | Public | Ouvre une session (`email`, `motDePasse`) |
| `POST` | `/api/deconnexion` | Session | Ferme la session |
| `GET` | `/api/session` | Session | Renvoie le compte connecté |
| `GET` | `/api/reservations` | Session | Liste les réservations du compte |
| `POST` | `/api/reservations` | Session | Réserve un vélo (`veloId`, `date`, `heureDebut`, `heureFin`) |
| `DELETE` | `/api/reservations/:id` | Session | Annule une réservation future appartenant au compte |

Les cookies de session sont HTTP-only et SameSite=Lax ; le flag Secure est activé en production. Les mots de passe ne sont jamais stockés en clair. Les requêtes SQL utilisent des paramètres. Les réservations concurrentes d’un même vélo sont sérialisées au moyen d’un verrou PostgreSQL sur la ligne du vélo avant de vérifier les chevauchements.

## Base de données

Le schéma est défini dans `backend/schema.sql`. Il contient les tables `velos`, `utilisateurs`, `sessions` et `reservations`. Les tarifs `tarif` sont journaliers pour une journée de neuf heures ; le prix d’une location plus courte est calculé ainsi :

```text
prix = tarif journalier × nombre d’heures / 9
```

Le catalogue accepte les catégories et vélos déjà présents dans la table `velos`. Le script ajoute les descriptions manquantes de façon compatible avec la table déjà utilisée par l’API initiale.

## Vérification

```powershell
cd backend
npm test
```

```powershell
cd frontend
npm run lint
npm run build
```
