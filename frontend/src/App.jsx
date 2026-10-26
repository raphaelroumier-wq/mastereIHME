
import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [velos, setVelos] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    async function recupererVelos() {
      try {
        const reponse = await fetch('/api/velos');

        if (!reponse.ok) {
          throw new Error('Impossible de récupérer les vélos.');
        }

        const donnees = await reponse.json();
        setVelos(donnees);
      } catch (erreur) {
        setErreur('Impossible de charger les vélos. Vérifie que le serveur Express fonctionne.');
      } finally {
        setChargement(false);
      }
    }

    recupererVelos();
  }, []);

  return (
    <div className="application">
      <header className="entete">
        <a className="logo" href="#">
          🚲 VéloLoc
        </a>

        <nav>
          <a href="#velos">Nos vélos</a>
          <a href="#fonctionnement">Comment ça marche ?</a>
        </nav>
      </header>

      <main>
        <section className="accueil">
          <p className="surtitre">LA LIBERTÉ SUR DEUX ROUES</p>
          <h1>Le vélo qu’il vous faut, au bon moment.</h1>
          <p className="introduction">
            Découvrez nos vélos et choisissez celui qui accompagnera
            votre prochaine sortie.
          </p>
          <a className="bouton principal" href="#velos">
            Découvrir les vélos
          </a>
        </section>

        <section className="section-velos" id="velos">
          <div className="titre-section">
            <p className="surtitre">NOTRE SÉLECTION</p>
            <h2>Nos vélos disponibles</h2>
            <p>Choisissez le vélo adapté à vos envies.</p>
          </div>

          {chargement && <p>Chargement des vélos...</p>}

          {!chargement && erreur && <p role="alert">{erreur}</p>}

          {!chargement && !erreur && velos.length === 0 && (
            <p>Aucun vélo disponible pour le moment.</p>
          )}

          {!chargement && !erreur && velos.length > 0 && (
            <div className="grille-velos">
              {velos.map((velo) => (
                <article className="carte-velo" key={velo.id}>
                  <div className="illustration-velo" aria-hidden="true">
                    {velo.type === 'Ville'
                      ? '🚲'
                      : velo.type === 'Électrique'
                        ? '⚡'
                        : '⛰️'}
                  </div>

                  <div className="contenu-carte">
                    <span className="etiquette">{velo.type}</span>
                    <h3>{velo.nom}</h3>
                    <p className="description">
                      {velo.description ||
                        'Découvrez ce vélo pour votre prochaine sortie.'}
                    </p>

                    <div className="bas-carte">
                      <p className="tarif">
                        {velo.tarif} € <span>/ jour</span>
                      </p>
                      <button
                        className="bouton"
                        onClick={() =>
                          alert(`Tu as choisi : ${velo.nom}`)
                        }
                      >
                        Choisir ce vélo
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="fonctionnement" id="fonctionnement">
          <h2>Comment ça marche ?</h2>
          <p>
            1. Choisissez un vélo. 2. Sélectionnez vos dates.
            3. Profitez de votre balade !
          </p>
          <p className="note">
            La réservation avec choix des dates sera ajoutée dans une
            prochaine étape.
          </p>
        </section>
      </main>

      <footer className="pied-page">
        <p>VéloLoc — Projet étudiant de réservation de vélos</p>
      </footer>
    </div>
  );
}

export default App;
