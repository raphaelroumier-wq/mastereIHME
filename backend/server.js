
const express = require('express');

const app = express();
const PORT = 3000;

// Liste temporaire de vélos pour tester notre API.
const velos = [
  { id: 1, nom: 'Vélo de ville', type: 'Ville', tarif: 12 },
  { id: 2, nom: 'Vélo électrique', type: 'Électrique', tarif: 25 },
  { id: 3, nom: 'VTT', type: 'Sport', tarif: 18 },
];

// Route permettant de récupérer la liste des vélos.
app.get('/api/velos', (req, res) => {
  res.json(velos);
});

// Démarrage du serveur.
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
