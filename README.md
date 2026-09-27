# 🌿 Wiqayati (وقايتي)
> **Plateforme Nationale Tunisienne de Dépistage Précoce et Prise en Charge du Diabète de Type 2**

[![CI — Wiqayati](https://github.com/amira-nasfi/wiqayati/actions/workflows/ci.yml/badge.svg)](https://github.com/amira-nasfi/wiqayati/actions/workflows/ci.yml)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/)
[![Django 4.2](https://img.shields.io/badge/django-4.2-green.svg)](https://www.djangoproject.com/)
[![React 19](https://img.shields.io/badge/react-19-cyan.svg)](https://react.dev/)
[![Expo 52+](https://img.shields.io/badge/expo-52+-black.svg)](https://expo.dev/)
[![HL7 FHIR R4](https://img.shields.io/badge/interop-HL7_FHIR_R4-firebrick.svg)](https://hl7.org/fhir/R4/)

---

## 📌 Présentation du Projet

**Wiqayati** est une solution numérique intégrée conçue pour le système de santé tunisien (Ministère de la Santé publique, Centres de Soins Primaires - CSP, et campagnes mobiles de dépistage). Elle permet :

1. **L'identification unique des patients** grâce à l'Identifiant National de Santé (**INS**).
2. **Le dépistage ciblé du diabète de type 2** à travers un questionnaire clinique standardisé administré par des agents de santé ou complété en auto-évaluation par les citoyens.
3. **L'évaluation instantanée du risque** via un moteur algorithmique/ML (score FINDRISC adapté au contexte épidémiologique et nutritionnel tunisien : *Faible*, *Intermédiaire*, *Élevé*).
4. **La génération assistée par Agent Hybride (Formulaire + DMI)** : remplacement du moteur de règles statique (« engine ruler ») par un agent cognitif avec garde-fous cliniques déterministes, extrayant les antécédents, traitements et bilans du Dossier Médical Informatisé pour produire des plans personnalisés (nutrition méditerranéenne tunisienne + activité physique adaptée), certifiés par un nutritionniste.
5. **La gestion d'une file d'attente prioritaire** pour les professionnels de santé (`STAT` pour risque élevé, `URGENT` pour intermédiaire, `ROUTINE` pour faible).
6. **Le suivi citoyen sur mobile** (consultation des recommandations, historique, alertes et auto-évaluation).
7. **Le pilotage épidémiologique ministériel** via un tableau de bord analytique par gouvernorat.
8. **L'interopérabilité HL7/FHIR R4** avec le Dossier Médical Partagé (serveur HAPI FHIR : ressources *Patient*, *QuestionnaireResponse*, *RiskAssessment*, *CarePlan*).

---

## 🏗️ Architecture Technique

Le projet est structuré sous forme de **monorepo** :

```text
wiqayati/
├── backend/                  # API REST Django & moteur métier
│   ├── apps/
│   │   ├── accounts/         # Authentification unifiée, RBAC, profils, notifications
│   │   ├── audit/            # Piste d'audit immuable, traçabilité des accès de santé
│   │   ├── care_plan/        # Plans de soins, client Agent Hybride (DMI + Formulaire) & repli règles
│   │   ├── fhir_bridge/      # Client HAPI FHIR R4 & tâches asynchrones Celery
│   │   ├── nutritionist_queue/# File de tri des priorités pour les nutritionnistes
│   │   ├── risk_engine/      # Moteur algorithmique de calcul du risque diabétique
│   │   └── screening/        # Dépistage, patients, vues citoyen & tableau de bord ministère
│   ├── scripts/              # Scripts d'initialisation (seed_demo.py)
│   ├── wiqayati/             # Configuration Django, Celery et WSGI/ASGI
│   └── manage.py
├── frontend/                 # Application Web (React 19 + TypeScript + Vite)
│   ├── src/
│   │   ├── components/       # Barre de navigation, cartes, formulaires, modales
│   │   ├── context/          # Contexte d'authentification JWT (AuthContext)
│   │   ├── pages/            # Portails : Agent, Nutritionniste, Ministère, IT, Citoyen
│   │   └── services/         # Client HTTP Axios et appels d'API
│   └── vite.config.ts
├── mobile/                   # Application Mobile Citoyen (Expo + React Native)
│   ├── src/
│   │   ├── app/              # Routes Expo Router (dossier, plan, autoeval, alertes)
│   │   ├── components/       # Interface responsive mobile et web
│   │   └── services/         # Connexion simplifiée par INS + Code PIN
│   └── app.json
├── infra/                    # Infrastructure Docker
│   ├── docker-compose.yml    # PostgreSQL, Redis, HAPI FHIR R4
│   └── hapi-fhir/            # Configuration du serveur FHIR
└── .github/workflows/        # Pipeline CI / CD (lint, tests, build)
```

---

## 🔑 Identifiants de Démonstration (Mock Data Credentials)

La mire de connexion unifiée est disponible sur : **`http://localhost:5173/connexion`** (Web) ainsi que sur l'application mobile (Expo). Elle offre une **bifurcation claire** entre l'**Espace Citoyen** et l'**Accès Professionnel**.

---

### 1. 🧑‍⚕️ Profils Professionnels (Santé & Administration)

Connectez-vous via l'onglet **« Accès Professionnel »** (ou utilisez les boutons de pré-remplissage en un clic au bas du formulaire) :

| Rôle | URL / Portail | Identifiant | Mot de passe | Nom & Prénom | Structure / Affectation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Super Administrateur** | `/django-admin/` | `superadmin` | `SuperAdmin2026!` | Super Admin | Administration système Django |
| **Administrateur IT** | `/admin/it` | `admin.it` | `Admin2026!` | Sami Bouaziz | DSI Ministère Santé (Supervision & Audit) |
| **Admin Ministère** | `/admin/ministere` | `admin.ministere` | `Admin2026!` | Dr. Houda Meddeb | Direction Santé Publique (Cartographie & KPIs) |
| **Nutritionniste 1** | `/nutritionniste` | `nutri.ben_ali` | `Nutri2026!` | Sirine Ben Ali | Hôpital Charles Nicolle, Tunis |
| **Nutritionniste 2** | `/nutritionniste` | `nutri.trabelsi` | `Nutri2026!` | Mohamed Trabelsi | CHU Hédi Chaker, Sfax |
| **Nutritionniste 3** | `/nutritionniste` | `nutri.chaabane` | `Nutri2026!` | Leila Chaâbane | CSB Sahloul, Sousse |
| **Agent Campagne** | `/agent` | `agent.campagne.sfax` | `Agent2026!` | Khaled Ferchichi | Unité Mobile Sfax (Dépistage terrain) |
| **Agent Soins Primaires**| `/agent` | `agent.csp.tunis` | `Agent2026!` | Amina Gharbi | Centre de Soins Primaires Bab Souika, Tunis |
| **Agent Soins Primaires**| `/agent` | `agent.csp.sousse` | `Agent2026!` | Yassine Saidani | Centre de Santé de Base Sousse Ville |

---

### 2. 🇹🇳 Profils Citoyens (Patients)

Pour reproduire l'usage grand public réel en Tunisie, les citoyens s'identifient simplement avec leur **CIN (8 chiffres)** et leur **Date de Naissance** :
1. **Sur le Web (`/connexion`)** : Onglet **« Espace Citoyen (CIN) »** → saisissez le CIN et la date de naissance (ou cliquez sur le bouton de démonstration *Mohamed Haddad*) → validation instantanée et restitution officielle de l'INS → accès au portail citoyen.
2. **Sur Mobile (Expo)** : Onglet **« Par CIN & Date de naissance »** (ou **« Par INS & Code PIN »** pour les connexions récurrentes).

| Patient (Nom & Prénom) | N° CIN *(8 chiffres)* | Date de Naissance | Identifiant INS | Code PIN | Gouvernorat | Profil Clinique & Statut |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| **Mohamed Haddad** *(Démo rapide)* | `08123456` | `15/03/1980` | `TUN10001980` | `1234` | Tunis | **Risque Élevé** (Plan validé, suivi nutritionnel actif) |
| **Fatma Belhaj** | `09234567` | `22/07/1975` | `TUN10001975` | `1234` | Sfax | **Risque Élevé** (Plan validé, suivi glycémique renforcé) |
| **Karim Mansouri** | `07345678` | `05/11/1968` | `TUN10001968` | `1234` | Sousse | **Risque Élevé** (En attente d'arbitrage nutritionniste) |
| **Ines Zouari** | `11456789` | `30/01/1990` | `TUN10001990` | `1234` | Tunis | **Risque Intermédiaire** (Plan hygiéno-diététique validé) |
| **Olfa Dridi** | `05567890` | `09/02/1985` | `TUN10001985` | `1234` | Nabeul | **Risque Faible** (Auto-évaluation périodique conseillée) |
| **Nabil Ayari** | `08012345` | `14/06/1972` | `TUN10001972` | `1234` | Tunis | Patient dépisté en consultation CSP |
| **Walid Ben Amor** | `07334455` | `02/04/1982` | `TUN10001982` | `1234` | Ben Arous | Patient suivi en soins primaires |
| **Amel Bouzid** | `13223344` | `10/10/1995` | `TUN10001995` | `1234` | Ariana | Auto-évaluation citoyenne en ligne |

> [!TIP]
> Sur la mire web `/connexion`, cliquez simplement sur **« Pré-remplir avec un compte citoyen de démo (Mohamed Haddad) »** pour tester l'identification citoyenne en un clic sans saisie manuelle.

---

## 🚀 Guide de Démarrage et d'Exécution

### 1. Prérequis
* **Python** : 3.10 ou supérieur
* **Node.js** : 18.x ou 20.x et **npm** >= 9.x
* **Docker & Docker Compose** (pour PostgreSQL, Redis et HAPI FHIR)

---

### 2. Démarrer l'Infrastructure (Base de données, Redis, FHIR)

Depuis la racine du projet, lancez les services conteneurisés :

```bash
docker compose -f infra/docker-compose.yml up -d db redis hapi-fhir-db hapi-fhir
```

Services disponibles :
* **PostgreSQL (Django)** : `localhost:5434`
* **Redis (Broker Celery & Cache)** : `localhost:6379`
* **Serveur HAPI FHIR R4** : `http://localhost:8085/fhir`

---

### 3. Démarrer le Backend (Django)

1. Ouvrez un terminal dans le dossier `backend` :
   ```bash
   cd backend
   ```

2. Créez et activez un environnement virtuel :
   * **Windows (PowerShell)** :
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   * **Linux / macOS** :
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. Installez les dépendances :
   ```bash
   pip install -r requirements/base.txt -r requirements/development.txt
   ```

4. Appliquez les migrations de la base de données :
   ```bash
   python manage.py migrate
   ```

5. Initialisez toutes les données de démonstration :
   ```bash
   python scripts/seed_demo.py
   # ou via la commande Django :
   python manage.py seed_demo_data
   ```

6. Lancez le serveur de développement :
   ```bash
   python manage.py runserver 8000
   ```

Le backend est accessible sur **`http://localhost:8000`** :
* **Documentation OpenAPI / Swagger** : [`http://localhost:8000/api/docs/`](http://localhost:8000/api/docs/)
* **Administration Django** : [`http://localhost:8000/django-admin/`](http://localhost:8000/django-admin/)

*(Optionnel)* Lancez le worker Celery pour la synchronisation FHIR asynchrone :
```bash
celery -A wiqayati worker --loglevel=info
```

---

### 4. Démarrer le Frontend Web (Portail Professionnels & Citoyen)

1. Dans un second terminal, placez-vous dans le dossier `frontend` :
   ```bash
   cd frontend
   ```

2. Installez les dépendances :
   ```bash
   npm install
   ```

3. Lancez le serveur de développement Vite :
   ```bash
   npm run dev
   ```

L'application web est accessible sur **`http://localhost:5173`**.

---

### 5. Démarrer l'Application Mobile Citoyenne (Expo / React Native)

1. Dans un troisième terminal, placez-vous dans le dossier `mobile` :
   ```bash
   cd mobile
   ```

2. Installez les dépendances :
   ```bash
   npm install
   ```

3. Lancez l'application avec Expo :
   ```bash
   npx expo start
   ```
   * Appuyez sur **`w`** pour ouvrir la version Web dans votre navigateur (`http://localhost:8081`).
   * Scannez le QR Code avec l'application mobile **Expo Go** (Android / iOS) sur votre smartphone connecté au même réseau Wi-Fi.

---

### 6. Lancement Global via Turborepo (Alternative monorepo)

À la racine du projet, vous pouvez également utiliser les scripts configurés :

```bash
# Installer toutes les dépendances frontend et mobile
npm install

# Lancer le frontend web
npm run dev:frontend

# Lancer l'application mobile
npm run dev:mobile
```

---

## 🔄 Flux Clinique Complet (Scénario de Démonstration)

Pour tester la chaîne de bout en bout :

```mermaid
sequenceDiagram
    autonumber
    actor C as Citoyen (Patient)
    actor A as Agent de Terrain (CSP / Campagne)
    participant B as Backend Wiqayati & Moteur Risque
    participant DMI as Connecteur DMI / FHIR
    participant H as Agent Hybride (API Soins)
    actor N as Nutritionniste
    participant F as Serveur HL7 HAPI FHIR

    C->>A: Présentation avec INS (ex: TUN10001980)
    A->>B: Saisie des constantes & réponses au questionnaire (14 vars)
    B->>B: Calcul score FINDRISC & probabilité dysglycémie
    B->>DMI: Extraction antécédents, traitements & biologie (INS)
    DMI-->>B: Données cliniques DMI
    B->>H: POST /agent/generer-plan/ (Formulaire + DMI)
    Note over H: NLP contextualisé + Guardrails cliniques
    H-->>B: Plan nutrition & activité personnalisé (Brouillon)
    B->>N: Assignation tâche prioritaire STAT dans la file
    B--)F: Synchronisation asynchrone FHIR (Patient, QuestionnaireResponse)
    N->>B: Consultation justification IA, réajustement & validation
    B->>C: Notification push / alerte "Plan de soin validé"
    C->>B: Connexion citoyenne (CIN + Date de Naissance ou INS + PIN)
```

1. **Dépistage** : Connectez-vous en tant qu'agent (`agent.campagne.sfax` / `Agent2026!`) sur `http://localhost:5173/agent`.
   * Recherchez un patient existant par CIN ou INS, ou créez un nouveau patient.
   * Remplissez le formulaire de dépistage (âge, IMC, antécédents, glycémie, habitudes de vie).
   * Soumettez : le score de risque est calculé instantanément.
2. **Tri et Validation** : Connectez-vous en tant que nutritionniste (`nutri.ben_ali` / `Nutri2026!`) sur `http://localhost:5173/nutritionniste`.
   * La file d'attente affiche le patient classé en priorité selon son niveau de risque.
   * Ouvrez le dossier, modifiez les recommandations si nécessaire et validez le plan de soin.
3. **Consultation Citoyenne** : Connectez-vous sur le portail Citoyen web ou mobile :
   * **Via CIN + Date de Naissance** (ex : `08123456` / `15/03/1980`) pour récupérer son INS automatiquement.
   * **Via INS + Code PIN** (ex : `TUN10001980` / `1234`).
   * Visualisez le statut du dépistage, les conseils nutritionnels et d'activité physique validés.
4. **Supervision Ministérielle** : Connectez-vous en tant que Ministère (`admin.ministere` / `Admin2026!`) sur `http://localhost:5173/admin/ministere`.
   * Observez la répartition géographique et les prévalences de facteurs de risque.

---

## 🧪 Tests et Qualité de Code

Le projet est vérifié automatiquement par un pipeline d'intégration continue GitHub Actions :

```bash
# 1. Vérification Flake8 Backend (PEP 8, longueur max 120 caractères)
python -m flake8 backend

# 2. Exécution des tests unitaires Django
python backend/manage.py test apps --settings=wiqayati.settings.development

# 3. Vérification des types TypeScript Frontend
npm run build --prefix frontend

# 4. Vérification des types TypeScript Mobile
npx tsc --noEmit --project mobile
```

---

## 📄 Licence

Ce projet est développé dans le cadre de la modernisation des systèmes d'information de santé préventive en Tunisie. Tous droits réservés.
