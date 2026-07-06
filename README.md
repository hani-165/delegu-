# Portail des cours

Plateforme simple orientée vers un seul usage :

- le délégué publie des documents
- les étudiants consultent et téléchargent **sans compte**
- **aucune authentification étudiant**
- **une seule authentification réelle**, réservée au délégué, pour éviter que n'importe qui supprime ou remplace les documents

## Pages

- `index.html` : page publique de consultation et téléchargement (aucun compte requis)
- `admin.html` : page unique du délégué (connexion requise)
- `dashboard.html` et `espace-delegue.html` : redirections vers `admin.html` (anciens doublons supprimés)

## Architecture actuelle

Le site est maintenant branché sur **Supabase** :

- **Base de données Postgres** : tables `documents` et `announcements`
- **Supabase Storage** : stockage réel des fichiers (bucket `documents`)
- **Supabase Auth** : un compte unique pour le délégué (email + mot de passe)
- **Supabase Realtime** : la liste des documents et des annonces se met à jour automatiquement, en direct, sur tous les appareils connectés au site

Résultat : un document publié par le délégué apparaît immédiatement chez tous les étudiants, sur n'importe quel appareil, sans qu'ils aient besoin de recharger la page ni de créer de compte.

## Mise en place (à faire une seule fois)

### 1. Créer un projet Supabase
Sur [supabase.com](https://supabase.com), créez un nouveau projet gratuit.

### 2. Créer les tables et les règles de sécurité
Dans Supabase, ouvrez **SQL Editor** et exécutez :

```sql
create table documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  teacher text not null,
  category text not null,
  description text,
  file_path text not null,
  file_name text not null,
  file_size bigint,
  file_type text,
  created_at timestamptz not null default now()
);

create table announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  date date not null,
  created_at timestamptz not null default now()
);

alter table documents enable row level security;
alter table announcements enable row level security;

-- Lecture publique (les étudiants n'ont pas de compte)
create policy "Public read documents" on documents for select using (true);
create policy "Public read announcements" on announcements for select using (true);

-- Ecriture réservée au délégué connecté
create policy "Authenticated insert documents" on documents for insert with check (auth.role() = 'authenticated');
create policy "Authenticated update documents" on documents for update using (auth.role() = 'authenticated');
create policy "Authenticated delete documents" on documents for delete using (auth.role() = 'authenticated');

create policy "Authenticated insert announcements" on announcements for insert with check (auth.role() = 'authenticated');
create policy "Authenticated update announcements" on announcements for update using (auth.role() = 'authenticated');
create policy "Authenticated delete announcements" on announcements for delete using (auth.role() = 'authenticated');
```

### 3. Activer le temps réel sur les deux tables
Dans **Database > Replication**, activez la réplication (realtime) pour `documents` et `announcements`.

Activez aussi `REPLICA IDENTITY FULL` sur les deux tables, pour que les suppressions incluent le titre du document ou de l'annonce (nécessaire pour des notifications complètes) :

```sql
alter table documents replica identity full;
alter table announcements replica identity full;
```

### 4. Créer le bucket de stockage
Dans **Storage**, créez un bucket nommé exactement `documents` et cochez **Public**.

Puis, dans **SQL Editor**, exécutez :

```sql
create policy "Public read documents bucket"
on storage.objects for select
using ( bucket_id = 'documents' );

create policy "Authenticated upload documents bucket"
on storage.objects for insert
with check ( bucket_id = 'documents' and auth.role() = 'authenticated' );

create policy "Authenticated delete documents bucket"
on storage.objects for delete
using ( bucket_id = 'documents' and auth.role() = 'authenticated' );
```

### 5. Créer le compte du délégué
Dans **Authentication > Users**, cliquez sur **Add user** et créez un compte avec un email et un mot de passe.

Ce sera l’unique identifiant utilisé pour se connecter sur `admin.html`. Les étudiants n’ont besoin d’aucun compte.

### 6. Renseigner les clés dans le projet
Ouvrez `assets/js/config.js` et remplacez les valeurs par celles de **Project Settings > API** :

```js
window.SUPABASE_CONFIG = {
  url: "https://VOTRE-PROJET.supabase.co",
  anonKey: "VOTRE_CLE_ANON_PUBLIQUE"
};
```

Utilisez bien la clé **anon public**, jamais la clé `service_role` (celle-ci ne doit jamais être utilisée côté navigateur).

## Utilisation

- Les étudiants ouvrent `index.html` : recherche, filtres par matière, téléchargement direct, aucune connexion.
- Le délégué ouvre `admin.html`, se connecte avec son compte Supabase, puis :
  - publie un document (titre, matière, professeur, type, description, fichier)
  - publie une annonce
  - supprime un document ou une annonce
  - change son mot de passe

## Sécurité

- La clé `anon` est publique par nature : la sécurité réelle vient des règles **Row Level Security** définies ci-dessus (lecture publique, écriture réservée aux comptes authentifiés).
- Ne partagez jamais la clé `service_role`.
- Le compte délégué doit être créé uniquement par vous, depuis le tableau de bord Supabase.

## Notifications (son, vibration, navigateur)

Chaque publication, modification ou suppression déclenche automatiquement, sur toutes les pages ouvertes (site public et espace délégué) :

- une notification visuelle (toast) en bas ou en haut de l'écran
- un son court généré nativement (aucun fichier audio à héberger)
- une vibration sur les appareils compatibles (Android principalement)
- une notification système du navigateur si l'onglet n'est pas au premier plan et que la permission a été accordée

Le bouton en forme de cloche dans l'en-tête permet à chacun de couper le son/la vibration (la notification visuelle reste toujours affichée). Ce réglage est stocké localement dans le navigateur de chaque visiteur.

**Limites à connaître :**
- Safari sur iPhone/iPad ne supporte pas l'API de vibration (limitation d'Apple, pas du site).
- Le son ne peut jouer qu'après au moins une interaction de l'utilisateur avec la page (règle imposée par tous les navigateurs pour éviter les sons intempestifs).
- Les notifications système nécessitent que l'utilisateur clique une fois sur la cloche pour autoriser la permission.

## Fichiers principaux

- `assets/css/app.css`
- `assets/js/config.js` (à modifier avec vos identifiants Supabase)
- `assets/js/supabase-client.js`
- `assets/js/shared.js`
- `assets/js/notifications.js`
- `assets/js/index.js`
- `assets/js/admin.js`
