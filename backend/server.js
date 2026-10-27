
require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

// Connexion à la base de données PostgreSQL.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Route qui récupère les vélos depuis PostgreSQL.
app.get('/api/velos', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nom, type, tarif FROM velos ORDER BY id'
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des vélos :', error);
    res.status(500).json({
      erreur: 'Impossible de récupérer les vélos.',
    });
  }
});

// Démarrage du serveur.
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
