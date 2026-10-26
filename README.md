# Application de réservation de vélos

## 1. Présentation du projet

Ce projet consiste à développer une application web permettant aux utilisateurs de consulter des vélos disponibles à la location et, à terme, de réserver un vélo pour une période donnée.

L'application est réalisée dans le cadre d'un projet de cours. Elle a pour objectif de mettre en pratique le développement web en JavaScript, l'architecture client-serveur, la gestion d'une base de données relationnelle, le versionnement avec Git et le déploiement avec Docker.

Le développement est réalisé progressivement, en commençant par l'interface utilisateur et l'API, avant d'intégrer la base de données et le système de réservation.

## 2. Objectifs et fonctionnalités

### Fonctionnalités actuellement implémentées

- Affichage d'une interface web développée avec React.
- Présentation d'une liste de vélos avec leur nom, leur catégorie et leur tarif.
- Mise en place d'un serveur HTTP avec Node.js et Express.
- Création d'une API REST permettant de récupérer la liste des vélos.
- Communication entre l'interface React et l'API Express.
- Utilisation de Git et GitHub pour versionner et sauvegarder le code source.

Pour le moment, les données des vélos sont stockées temporairement dans le code du serveur.

### Fonctionnalités prévues

- Intégration d'une base de données PostgreSQL.
- Stockage et récupération des informations des vélos depuis la base de données.
- Création d'un système de réservation.
- Vérification de la disponibilité d'un vélo pour une période donnée.
- Validation des dates et prévention des réservations qui se chevauchent.
- Gestion des erreurs et des réponses de l'API.
- Conteneurisation des différents services avec Docker et orchestration avec Docker Compose.

Ces fonctionnalités seront ajoutées progressivement au cours du développement.

## 3. Architecture technique

Le projet repose sur une architecture en trois couches :

### Frontend — React

Le frontend correspond à la partie visible de l'application. Il permet à l'utilisateur d'interagir avec l'interface et de consulter les informations disponibles.

Technologies : React, JavaScript, HTML, CSS et Vite.

### Backend — Node.js et Express

Le backend gère les requêtes HTTP, expose les routes de l'API et contient la logique métier de l'application.

Technologies : JavaScript, Node.js et Express.

### Base de données — PostgreSQL

La base de données sera chargée de conserver durablement les informations nécessaires à l'application, notamment les vélos et les réservations.

Technologies prévues : PostgreSQL et Docker.

### Fonctionnement général

Le navigateur affiche l'interface React. Lorsque celle-ci a besoin de données, elle envoie une requête HTTP à l'API Express. Le serveur traite la requête et, une fois PostgreSQL intégré, interrogera la base de données avant de renvoyer une réponse au frontend.

Le navigateur ne communiquera pas directement avec PostgreSQL.

## 4. Technologies utilisées

| Technologie | Rôle |
|---|---|
| JavaScript | Langage utilisé pour le frontend et le backend |
| React | Création de l'interface utilisateur |
| Vite | Serveur de développement et outil de construction du frontend |
| Node.js | Exécution de JavaScript côté serveur |
| Express | Création du serveur HTTP et de l'API |
| PostgreSQL | Stockage relationnel des données (prévu) |
| Docker | Conteneurisation des services (prévue) |
| Docker Compose | Orchestration des services (prévue) |
| Git | Gestion de l'historique du code |
| GitHub | Hébergement du dépôt distant |
| Visual Studio Code | Environnement de développement |

## 5. Organisation du projet

L'organisation cible du dépôt est la suivante :

```text
reservation-velos/
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── App.css
│   ├── vite.config.js
│   └── package.json
├── backend/
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
├── database/
│   └── (scripts SQL à ajouter)
├── compose.yaml
├── .gitignore
└── README.md
```

**Remarque :** les dossiers et fichiers liés à PostgreSQL et Docker représentent l'organisation envisagée. Ils seront créés lorsqu'ils seront nécessaires.

- `frontend/` : contient l'interface React et sa configuration.
- `backend/` : contient le serveur Express et l'API.
- `database/` : accueillera les scripts SQL de création et d'évolution du schéma de la base de données.
- `compose.yaml` : servira à définir les services Docker.
- `.gitignore` : indique à Git quels fichiers ne doivent pas être versionnés.
- `README.md` : présente le projet et explique comment l'utiliser.

## 6. Installation et lancement en développement

### Prérequis

Les outils nécessaires sont :

- Node.js et npm.
- Git.
- Visual Studio Code, ou un autre éditeur de code.

Docker sera nécessaire lors de l'intégration de PostgreSQL dans l'environnement conteneurisé.

### Lancer le backend

Depuis un terminal, se placer dans le dossier du backend :

```powershell
cd backend
npm install
node server.js
```

Le serveur Express démarre sur :

`http://localhost:3000`

L'API permettant de récupérer la liste des vélos est accessible à l'adresse :

`http://localhost:3000/api/velos`

Cette route renvoie actuellement les données temporaires des trois vélos définis dans le code.

### Lancer le frontend

Ouvrir un deuxième terminal et se placer dans le dossier du frontend :

```powershell
cd frontend
npm install
npm run dev
```

Vite démarre le serveur de développement. L'adresse affichée dans le terminal est généralement :

`http://localhost:5173`

Le frontend utilise un proxy de développement configuré dans `vite.config.js` pour transmettre les requêtes `/api` au serveur Express.

**Important :** les deux serveurs doivent fonctionner simultanément pour que l'interface puisse récupérer les données de l'API.

Sous Windows PowerShell, si la commande `npm` est bloquée par la stratégie d'exécution des scripts, utiliser `npm.cmd` à la place, par exemple `npm.cmd install` ou `npm.cmd run dev`.

## 7. API actuelle

### Récupérer la liste des vélos

- **Méthode HTTP :** `GET`
- **Route :** `/api/velos`
- **Port du serveur :** `3000`
- **Réponse :** tableau JSON contenant les vélos.

Exemple de réponse :

```json
[
  {
    "id": 1,
    "nom": "Vélo de ville",
    "type": "Ville",
    "tarif": 12
  },
  {
    "id": 2,
    "nom": "Vélo électrique",
    "type": "Électrique",
    "tarif": 25
  },
  {
    "id": 3,
    "nom": "VTT",
    "type": "Sport",
    "tarif": 18
  }
]
```

Les tarifs sont actuellement des valeurs numériques de démonstration. Leur devise et les éventuelles règles tarifaires devront être précisées dans la suite du projet.

## 8. Gestion de version avec Git

Le projet est versionné avec Git et hébergé sur GitHub.

Les commandes courantes sont :

```bash
git status
git add .
git diff --staged
git commit -m "Description des modifications"
git push
```

- `git status` : affiche l'état des fichiers.
- `git add` : prépare les modifications pour le prochain commit.
- `git diff --staged` : permet de vérifier les changements préparés.
- `git commit` : enregistre un point de sauvegarde dans l'historique local.
- `git push` : envoie les commits vers le dépôt distant.

Les dossiers `node_modules/` et les fichiers `.env` ne doivent pas être versionnés. Les fichiers de verrouillage des dépendances, tels que `package-lock.json`, doivent en revanche être conservés dans Git.

Aucun mot de passe ni identifiant secret ne doit être ajouté au dépôt.

## 9. Prochaines étapes

Le développement suivra les étapes suivantes :

1. Mettre en place PostgreSQL et son environnement Docker.
2. Définir le schéma relationnel de la base de données.
3. Connecter le backend Express à PostgreSQL.
4. Remplacer les données temporaires par des requêtes SQL.
5. Définir le modèle de données des réservations et les relations entre les tables.
6. Implémenter la création des réservations et les contrôles de disponibilité.
7. Tester les cas normaux, les erreurs et les conflits de réservation.
8. Conteneuriser le frontend, le backend et la base de données avec Docker Compose.
9. Compléter la documentation et vérifier que le projet peut être lancé depuis un environnement propre.

## 10. État actuel du projet

Le projet dispose d'une première interface React fonctionnelle et d'un serveur Express opérationnel. La communication entre le frontend et l'API a été vérifiée.

La base de données PostgreSQL et les fonctionnalités de réservation restent à développer.

Ce README sera mis à jour au fur et à mesure de l'évolution du projet.
