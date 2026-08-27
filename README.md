# Analysis Ultimate — Basalte-Web

**Version 3.2.0 ULTIMATE CAUSAL CONTEXT** — application web locale d’intelligence commerciale autonome pour les extractions TGM.

Cette version conserve l’intégralité de la v3.1 GEO API SENTINEL et ajoute le **Causal Context Engine** : chaque constat commercial est désormais testé automatiquement contre les travaux, la mobilité, les zones témoins et les causes concurrentes, sans intervention humaine. Les fichiers Clients, Ventes et Catalogue restent traités dans le navigateur : aucune donnée TGM n’est envoyée à Clermont Métropole, GitHub ou Basalte-Web.

## Fonctionnement normal

L’utilisateur charge :

- `Clients.xlsx` : `Clients.xlsx`, `Clients(3).xlsx`, etc. ;
- un ou plusieurs `Ventes.csv` : `Ventes.csv`, `Ventes(1).csv`, etc. ;
- `Catalogue.xlsx` : `Catalogue.xlsx`, `Catalogue(14).xlsx`, etc.

Analysis Ultimate enchaîne ensuite automatiquement : validation → croisement → analyses générales → diagnostic → Geo Intelligence → Clermont API Sentinel → **couplage causal contextuel de tous les diagnostics** → actions internes → priorités → suivi entre imports.

Le nom des fichiers est contrôlé mais ne suffit jamais : schéma interne, colonnes, dates, identifiants et cohérences financières sont aussi vérifiés.

## Autopilot

Après validation des trois fichiers, le logiciel exécute automatiquement les actions internes suivantes :

1. croisement Clients ↔ Ventes ↔ Catalogue ;
2. contrôle des chevauchements et contradictions ;
3. tendance CA / tickets / panier / marge ;
4. décomposition de la variation du CA entre fréquentation et panier ;
5. classement des clients à risque ;
6. calcul du plan de réapprovisionnement théorique ;
7. détection des produits en décrochage ;
8. détection de ruptures de tendance ;
9. surveillance des zones clermontoises ;
10. clients attendus dans leur fenêtre habituelle de revisite ;
11. prévisions géographiques à 7 jours lorsque l’historique est suffisant ;
12. génération des constats, explications et actions prioritaires ;
13. comparaison aux snapshots des imports précédents ;
14. audit automatique du contexte public et de l’API Clermont Métropole ;
15. test automatique de chaque constat contre les travaux, la chronologie, les zones témoins et les causes concurrentes ;
16. génération d’une chaîne explicative et d’un score contextuel pour chaque diagnostic exploitable.

Les actions externes irréversibles — envoyer un SMS, appeler un client, passer une commande — sont préparées mais jamais déclenchées sans système externe explicitement autorisé.

## Geo Intelligence — Clermont Impact Engine

`js/geo.js` analyse automatiquement l’origine géographique des clients et le comportement commercial de chaque zone.

### Découpage commercial

- Clermont Est / Nord-Est ;
- Brézet / Est commercial lorsque l’adresse contient une information suffisamment précise ;
- Montferrand / République ;
- Estaing / Michelin ;
- La Plaine / Nord-Est ;
- Pardieu / Oradou ;
- Centre / Jaude ;
- Est métropole ;
- Nord métropole ;
- Sud métropole ;
- Ouest métropole ;
- Puy-de-Dôme hors zone proche.

### Découpage travaux Métropole

- Clermont-Centre ;
- Nord & Est ;
- Ouest ;
- Sud.

### Calculs automatiques par zone

- clients et clients actifs ;
- visites ;
- CA et marge ;
- panier moyen ;
- visites par client ;
- évolution CA / visites / panier / clients ;
- comparaison de la zone au reste de la clientèle ;
- CA attendu selon les zones témoins ;
- écart commercial statistique estimé ;
- clients à risque et valeur historique concernée ;
- revisites attendues ;
- prévision à 7 jours ;
- rupture de tendance ;
- changement d’horaires ;
- changement de jours de visite ;
- Impact Score 0–100 ;
- garde-fou contre une dernière journée d’extraction incomplète.

## Causal Context Engine — v3.2

Les travaux ne sont plus analysés uniquement dans Geo Intelligence. Ils sont testés automatiquement derrière chaque constat : CA, marge, trafic, jours de semaine, rayons, familles, produits, clients, retours et autres diagnostics disposant d’un échantillon suffisant.

Le moteur calcule :

- zones qui contribuent réellement à la baisse ou à la remontée ;
- comparaison de chaque zone au reste de la clientèle ;
- proximité temporelle entre rupture commerciale et début/fin des travaux ;
- variation avant/après l’événement lorsqu’un historique suffisant existe ;
- affinité entre le lieu du chantier et le micro-secteur commercial ;
- sévérité de l’impact annoncé : route barrée, déviation, circulation perturbée, etc. ;
- qualité et fraîcheur de la source publique ;
- causes concurrentes : stock, prix, saisonnalité/vacances, météo et remises.

Chaque conclusion affiche ensuite un bloc **Contexte Clermont** avec une chaîne explicative, les événements testés, les alternatives et un score de compatibilité.

Les seuils sont : 78–100 forte, 58–77 moyenne, 36–57 faible, moins de 36 aucun signal travaux convaincant. Il s’agit toujours d’un **signal contextuel**, pas d’une preuve absolue de causalité.

Un nouvel écran **Contexte causal** regroupe les diagnostics les plus liés à l’environnement urbain et les chantiers reliés à plusieurs variations commerciales.

Voir `docs/CAUSAL_CONTEXT_ENGINE.md`.

## Clermont API Sentinel — v3.1

La GitHub Action `.github/workflows/update-public-context.yml` interroge uniquement des sources publiques. Elle s’exécute quatre fois par jour et peut aussi être lancée manuellement.

### Source principale

`https://opendata.clermontmetropole.eu/api/explore/v2.1`

Le connecteur :

- teste la disponibilité de l’API ;
- mesure la latence ;
- lit automatiquement le catalogue des jeux disponibles ;
- détecte sans liste figée les jeux qui parlent de travaux, circulation, voirie, mobilité ou stationnement ;
- vérifie les jeux structurants connus ;
- tolère un changement d’identifiant en recherchant le jeu correspondant par titre/description ;
- lit le jeu de stationnement métropolitain en temps réel ;
- vérifie la présence de la Base Adresse Locale et des axes de voie ;
- tente de normaliser automatiquement des jeux de travaux/mobilité apparus dans le catalogue ;
- publie un état de santé détaillé dans `data/public-context.json`.

### Fallback travaux

Si un jeu API n’est pas disponible, Analysis Ultimate utilise en complément les pages officielles de travaux Centre / Nord & Est / Ouest / Sud.

Si une page officielle est temporairement bloquée ou inaccessible, le moteur conserve le dernier contexte valide au lieu d’effacer les données.

### Last-known-good et écriture transactionnelle

Le nouveau payload est d’abord généré dans un fichier temporaire, puis validé. Le fichier public n’est remplacé que si sa structure est correcte.

Une panne API n’empêche jamais les analyses TGM locales. Elle réduit uniquement le niveau de confiance accordé aux explications externes.

### Historique public

`data/public-context-history.json` conserve des snapshots synthétiques du contexte public :

- disponibilité de l’API ;
- nombre de travaux détectés ;
- répartition des travaux par secteur ;
- nombre de parkings lus ;
- occupation moyenne disponible ;
- couverture météo.

Aucune donnée client n’y figure.

## Stationnement Métropole

Le connecteur utilise le jeu public :

`occupation_parcs_stationnement_metropolitains`

Le moteur normalise automatiquement les champs disponibles et affiche notamment :

- nombre de parcs exploitables ;
- taux moyen d’occupation ;
- parc le plus chargé ;
- nombre de parcs ≥ 85 % d’occupation.

Ce signal reste contextuel : un parking chargé ne constitue pas une preuve de causalité commerciale.

## Base Adresse Locale et axes de voie

Le connecteur contrôle aussi automatiquement les jeux :

- `base-adresse-locale-clermont-auvergne-metropole` ;
- `axes-de-voie-de-la-metropole` ou leur équivalent retrouvé dynamiquement dans le catalogue.

**Important :** Analysis Ultimate n’envoie jamais les adresses de tes clients vers l’API. L’API sert uniquement à récupérer/valider des données publiques. La classification client reste locale dans le navigateur.

## Météo

Open-Meteo reste utilisé pour le contexte météo récent. Le logiciel rapproche pluie et fréquentation uniquement lorsque suffisamment de jours communs existent.

## Niveaux de confiance

Le moteur distingue :

- **Fait** : valeur présente dans les extractions ;
- **Calcul** : calcul déterministe ;
- **Estimation** : projection ou contrefactuel statistique ;
- **Signal / hypothèse** : explication compatible avec les données ;
- **Bloqué** : information insuffisante ou contradictoire.

Une coïncidence entre travaux et baisse d’une zone est donc formulée comme « compatible avec un impact d’accès/mobilité », pas comme cause certaine.

## Sécurité

Les données TGM restent dans le navigateur et peuvent être stockées localement dans IndexedDB. Le `.gitignore` bloque notamment :

- `*.csv`
- `*.xlsx`
- `*.xls`
- `*.ods`
- `*.zip`

Le workflow GitHub ne lit que `scripts/`, `data/` et les sources publiques Internet. Il n’a aucun accès aux fichiers sélectionnés dans le navigateur de l’utilisateur.

## Installation GitHub Pages

1. Remplacer tous les anciens fichiers par le contenu de ce dossier.
2. GitHub → **Settings → Pages**.
3. Source : `Deploy from a branch`.
4. Branche : `main`, dossier `/ (root)`.
5. Vérifier que la page affiche **v3.2.0 ULTIMATE CAUSAL CONTEXT**.
6. Ouvrir **Actions → Clermont API Sentinel** et lancer **Run workflow** une première fois.
7. Si GitHub bloque le push du workflow : **Settings → Actions → General → Workflow permissions → Read and write permissions**.
8. Attendre le commit automatique de `data/public-context.json` puis recharger le site.
9. Dans **Geo Intelligence → Sources publiques & API**, vérifier **API CONNECTÉE**.

## Vérification technique locale du dépôt

```bash
python -m py_compile scripts/update_public_context.py scripts/validate_public_context.py
python tests/test_public_context.py
node tests/test_causal_context.js
python scripts/validate_public_context.py
```

Les appels Internet réels du connecteur s’exécutent dans GitHub Actions après publication.

## Structure

```text
analysis-ultimate/
├── index.html
├── sw.js
├── manifest.webmanifest
├── data/
│   ├── public-context.json
│   └── public-context-history.json
├── .github/workflows/
│   └── update-public-context.yml
├── scripts/
│   ├── update_public_context.py
│   └── validate_public_context.py
├── tests/
│   ├── test_public_context.py
│   └── test_causal_context.js
├── css/
├── js/
└── docs/
```
