require('dotenv').config();

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const express = require('express');
const { Pool } = require('pg');
const { isValidDate, validateReservation } = require('./reservationRules');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SESSION_COOKIE = 'veloloc_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const BASE_PATH = process.env.BASE_PATH || '/';
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 4,
});

app.use(express.json({ limit: '10kb' }));

app.get('/api/health', async (request, response, next) => {
  try {
    await pool.query('SELECT 1');
    return response.json({ status: 'ok' });
  } catch (error) {
    console.error('Échec du contrôle de santé PostgreSQL :', error.message);
    return response.status(503).json({ status: 'unavailable' });
  }
});

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, expectedHash] = storedHash.split(':');
  const actualHash = Buffer.from(hashPassword(password, salt).split(':')[1], 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actualHash.length === expected.length && crypto.timingSafeEqual(actualHash, expected);
}

function cookieValue(request, name) {
  const cookies = request.headers.cookie?.split(';') ?? [];
  const cookie = cookies.find((item) => item.trim().startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.trim().slice(name.length + 1)) : null;
}

function setSessionCookie(response, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=${BASE_PATH}; Max-Age=${SESSION_DURATION_MS / 1000}${secure}`,
  );
}

function clearSessionCookie(response) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=${BASE_PATH}; Max-Age=0${secure}`,
  );
}

async function authenticatedUser(request, response, next) {
  try {
    const token = cookieValue(request, SESSION_COOKIE);
    if (!token) {
      return response.status(401).json({ erreur: 'Connectez-vous pour continuer.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await pool.query(
      `SELECT utilisateurs.id, utilisateurs.nom, utilisateurs.email
       FROM sessions
       JOIN utilisateurs ON utilisateurs.id = sessions.utilisateur_id
       WHERE sessions.token_hash = $1 AND sessions.expires_at > NOW()`,
      [tokenHash],
    );

    if (!result.rowCount) {
      clearSessionCookie(response);
      return response.status(401).json({ erreur: 'Votre session a expiré. Reconnectez-vous.' });
    }

    request.user = result.rows[0];
    return next();
  } catch (error) {
    return next(error);
  }
}

async function createSession(userId, db = pool) {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await db.query(
    `INSERT INTO sessions (utilisateur_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
    [userId, tokenHash],
  );
  return token;
}

function publicBike(row) {
  return {
    id: row.id,
    nom: row.nom,
    type: row.type,
    tarif: Number(row.tarif),
    description: row.description,
  };
}

app.get('/api/velos', async (request, response, next) => {
  try {
    const { type, budget } = request.query;
    const params = [];
    const filters = [];

    if (typeof type === 'string' && type.trim()) {
      params.push(type.trim());
      filters.push(`type = $${params.length}`);
    }
    if (budget !== undefined) {
      const maxBudget = Number(budget);
      if (!Number.isFinite(maxBudget) || maxBudget < 0) {
        return response.status(400).json({ erreur: 'Le budget doit être un nombre positif.' });
      }
      params.push(maxBudget);
      filters.push(`tarif <= $${params.length}`);
    }

    const result = await pool.query(
      `SELECT id, nom, type, tarif, description
       FROM velos ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
       ORDER BY id`,
      params,
    );
    return response.json(result.rows.map(publicBike));
  } catch (error) {
    return next(error);
  }
});

app.get('/api/velos/:id/disponibilites', async (request, response, next) => {
  try {
    const bikeId = Number(request.params.id);
    const { date } = request.query;
    if (!Number.isInteger(bikeId) || bikeId < 1 || !isValidDate(date)) {
      return response.status(400).json({ erreur: 'Vélo ou date invalide.' });
    }

    const check = await pool.query('SELECT id FROM velos WHERE id = $1', [bikeId]);
    if (!check.rowCount) {
      return response.status(404).json({ erreur: 'Ce vélo n’existe pas.' });
    }

    const reservations = await pool.query(
      `SELECT heure_debut, heure_fin FROM reservations
       WHERE velo_id = $1 AND date_location = $2::date AND statut = 'confirmee'`,
      [bikeId, date],
    );
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentHour = now.getHours();
    const slots = Array.from({ length: 9 }, (_, index) => {
      const start = 9 + index;
      const end = start + 1;
      const heure = `${String(start).padStart(2, '0')}:00`;
      const past = date < today || (date === today && start <= currentHour);
      const reserved = reservations.rows.some((reservation) => {
        const reservationStart = Number(String(reservation.heure_debut).slice(0, 2));
        const reservationEnd = Number(String(reservation.heure_fin).slice(0, 2));
        return start < reservationEnd && end > reservationStart;
      });
      return { heure, disponible: !past && !reserved };
    });

    return response.json({ date, slots });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/inscription', async (request, response, next) => {
  const { nom, email, motDePasse } = request.body ?? {};
  if (
    typeof nom !== 'string' || nom.trim().length < 2 || nom.trim().length > 80 ||
    typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
    typeof motDePasse !== 'string' || motDePasse.length < 10 || motDePasse.length > 128
  ) {
    return response.status(400).json({
      erreur: 'Vérifiez votre nom, votre adresse email et votre mot de passe (10 caractères minimum).',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const passwordHash = hashPassword(motDePasse);
    const result = await client.query(
      `INSERT INTO utilisateurs (nom, email, mot_de_passe_hash)
       VALUES ($1, $2, $3)
       RETURNING id, nom, email`,
      [nom.trim(), email.trim().toLowerCase(), passwordHash],
    );
    const token = await createSession(result.rows[0].id, client);
    await client.query('COMMIT');
    setSessionCookie(response, token);
    return response.status(201).json({ utilisateur: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return response.status(409).json({ erreur: 'Un compte existe déjà avec cette adresse email.' });
    }
    return next(error);
  } finally {
    client.release();
  }
});

app.post('/api/connexion', async (request, response, next) => {
  const { email, motDePasse } = request.body ?? {};
  if (typeof email !== 'string' || typeof motDePasse !== 'string') {
    return response.status(400).json({ erreur: 'Saisissez votre adresse email et votre mot de passe.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, nom, email, mot_de_passe_hash FROM utilisateurs WHERE email = $1',
      [email.trim().toLowerCase()],
    );
    if (!result.rowCount || !verifyPassword(motDePasse, result.rows[0].mot_de_passe_hash)) {
      return response.status(401).json({ erreur: 'Adresse email ou mot de passe incorrect.' });
    }

    const token = await createSession(result.rows[0].id);
    setSessionCookie(response, token);
    return response.json({
      utilisateur: { id: result.rows[0].id, nom: result.rows[0].nom, email: result.rows[0].email },
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/session', async (request, response, next) => {
  try {
    const token = cookieValue(request, SESSION_COOKIE);
    if (!token) {
      return response.json({ utilisateur: null });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await pool.query(
      `SELECT utilisateurs.id, utilisateurs.nom, utilisateurs.email
       FROM sessions
       JOIN utilisateurs ON utilisateurs.id = sessions.utilisateur_id
       WHERE sessions.token_hash = $1 AND sessions.expires_at > NOW()`,
      [tokenHash],
    );

    if (!result.rowCount) {
      clearSessionCookie(response);
      return response.json({ utilisateur: null });
    }

    return response.json({ utilisateur: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/deconnexion', async (request, response, next) => {
  try {
    const token = cookieValue(request, SESSION_COOKIE);
    if (token) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
    }
    clearSessionCookie(response);
    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
});

app.get('/api/reservations', authenticatedUser, async (request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT reservations.id, reservations.date_location, reservations.heure_debut,
              reservations.heure_fin, reservations.prix_total, reservations.statut,
              velos.nom AS velo_nom, velos.type AS velo_type
       FROM reservations
       JOIN velos ON velos.id = reservations.velo_id
       WHERE reservations.utilisateur_id = $1
       ORDER BY reservations.date_location DESC, reservations.heure_debut`,
      [request.user.id],
    );
    return response.json(result.rows);
  } catch (error) {
    return next(error);
  }
});

app.post('/api/reservations', authenticatedUser, async (request, response, next) => {
  const validation = validateReservation(request.body ?? {});
  if (!validation.valid) {
    return response.status(400).json({ erreur: validation.erreur });
  }
  const { veloId, date, heureDebut, heureFin } = validation;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const bike = await client.query('SELECT id, tarif FROM velos WHERE id = $1 FOR UPDATE', [veloId]);
    if (!bike.rowCount) {
      await client.query('ROLLBACK');
      return response.status(404).json({ erreur: 'Ce vélo n’existe pas.' });
    }

    const overlap = await client.query(
      `SELECT id FROM reservations
       WHERE velo_id = $1 AND date_location = $2::date AND statut = 'confirmee'
         AND heure_debut < $4::time AND heure_fin > $3::time
       LIMIT 1`,
      [veloId, date, heureDebut, heureFin],
    );
    if (overlap.rowCount) {
      await client.query('ROLLBACK');
      return response.status(409).json({ erreur: 'Ce créneau vient d’être réservé. Choisissez un autre horaire.' });
    }

    const duration = Number(heureFin.slice(0, 2)) - Number(heureDebut.slice(0, 2));
    const price = (Number(bike.rows[0].tarif) * duration) / 9;
    const created = await client.query(
      `INSERT INTO reservations (utilisateur_id, velo_id, date_location, heure_debut, heure_fin, prix_total)
       VALUES ($1, $2, $3::date, $4::time, $5::time, $6)
       RETURNING id, date_location, heure_debut, heure_fin, prix_total, statut`,
      [request.user.id, veloId, date, heureDebut, heureFin, price.toFixed(2)],
    );
    await client.query('COMMIT');
    return response.status(201).json({ reservation: created.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
});

app.delete('/api/reservations/:id', authenticatedUser, async (request, response, next) => {
  const reservationId = Number(request.params.id);
  if (!Number.isInteger(reservationId) || reservationId < 1) {
    return response.status(400).json({ erreur: 'Réservation invalide.' });
  }

  try {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentHour = `${String(now.getHours()).padStart(2, '0')}:00`;
    const result = await pool.query(
      `UPDATE reservations SET statut = 'annulee'
       WHERE id = $1 AND utilisateur_id = $2 AND statut = 'confirmee'
         AND (date_location > $3::date OR
              (date_location = $3::date AND heure_debut > $4::time))
       RETURNING id`,
      [reservationId, request.user.id, today, currentHour],
    );
    if (!result.rowCount) {
      return response.status(404).json({ erreur: 'Réservation introuvable ou déjà commencée.' });
    }
    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
});

app.use(express.static(FRONTEND_DIST, { index: false }));

app.get(/.*/, (request, response, next) => {
  if (request.path === '/api' || request.path.startsWith('/api/')) {
    return next();
  }
  return response.sendFile(path.join(FRONTEND_DIST, 'index.html'), (error) => {
    if (error) next(error);
  });
});

app.use((error, request, response, next) => {
  console.error('Erreur API :', error);
  if (response.headersSent) {
    return next(error);
  }
  if (error.type === 'entity.parse.failed') {
    return response.status(400).json({ erreur: 'Le corps de la requête doit être un JSON valide.' });
  }
  if (error.type === 'entity.too.large') {
    return response.status(413).json({ erreur: 'La requête est trop volumineuse.' });
  }
  return response.status(500).json({ erreur: 'Une erreur est survenue. Veuillez réessayer.' });
});

async function start() {
  const schema = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Impossible de démarrer le serveur :', error);
    process.exitCode = 1;
  });
}

module.exports = { app, pool };
