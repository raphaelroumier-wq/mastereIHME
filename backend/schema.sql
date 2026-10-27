CREATE TABLE IF NOT EXISTS velos (
  id SERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  type TEXT NOT NULL,
  tarif NUMERIC(8, 2) NOT NULL CHECK (tarif >= 0),
  description TEXT
);

ALTER TABLE velos ADD COLUMN IF NOT EXISTS description TEXT;

INSERT INTO velos (nom, type, tarif, description)
SELECT 'Vélo de ville', 'Ville', 12, 'Le compagnon idéal pour vos trajets et balades urbaines.'
WHERE NOT EXISTS (SELECT 1 FROM velos WHERE nom = 'Vélo de ville');

INSERT INTO velos (nom, type, tarif, description)
SELECT 'Vélo électrique', 'Électrique', 25, 'Parcourez plus de distance avec une assistance agréable.'
WHERE NOT EXISTS (SELECT 1 FROM velos WHERE nom = 'Vélo électrique');

UPDATE velos
SET nom = 'Vélo de route',
    description = 'Prenez la route et avalez les kilomètres avec légèreté.'
WHERE nom = 'VTT tout terrain';

INSERT INTO velos (nom, type, tarif, description)
SELECT 'Vélo de route', 'Sport', 18, 'Prenez la route et avalez les kilomètres avec légèreté.'
WHERE NOT EXISTS (SELECT 1 FROM velos WHERE nom = 'Vélo de route');

CREATE TABLE IF NOT EXISTS utilisateurs (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(80) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  mot_de_passe_hash TEXT NOT NULL,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_expiration_idx ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS reservations (
  id BIGSERIAL PRIMARY KEY,
  utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id),
  velo_id INTEGER NOT NULL REFERENCES velos(id),
  date_location DATE NOT NULL,
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  prix_total NUMERIC(8, 2) NOT NULL CHECK (prix_total >= 0),
  statut VARCHAR(12) NOT NULL DEFAULT 'confirmee'
    CHECK (statut IN ('confirmee', 'annulee')),
  cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (heure_debut >= TIME '09:00' AND heure_fin <= TIME '18:00' AND heure_debut < heure_fin)
);

CREATE INDEX IF NOT EXISTS reservations_velo_date_idx
  ON reservations (velo_id, date_location) WHERE statut = 'confirmee';
CREATE INDEX IF NOT EXISTS reservations_utilisateur_idx
  ON reservations (utilisateur_id, date_location);
