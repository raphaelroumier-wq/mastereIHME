
import './App.css';

const velos = [
  {
    id: 1,
    nom: 'Vélo de ville',
    type: 'Ville',
    description: 'Idéal pour les déplacements quotidiens et les balades.',
    tarif: 12,
    emoji: '🚲',
  },
  {
    id: 2,
    nom: 'Vélo électrique',
    type: 'Électrique',
    description: 'Profite de l’assistance électrique pour aller plus loin.',
    tarif: 25,
    emoji: '⚡',
  },
  {
    id: 3,
    nom: 'VTT',
    type: 'Sport',
    description: 'Parfait pour les chemins et les aventures en nature.',
    tarif: 18,
    emoji: '⛰️',
  },
];

function App() {
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

          <div className="grille-velos">
            {velos.map((velo) => (
              <article className="carte-velo" key={velo.id}>
                <div className="illustration-velo" aria-hidden="true">
                  {velo.emoji}
                </div>

                <div className="contenu-carte">
                  <span className="etiquette">{velo.type}</span>
                  <h3>{velo.nom}</h3>
                  <p className="description">{velo.description}</p>

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
