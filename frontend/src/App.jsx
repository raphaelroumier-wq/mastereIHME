import { useEffect, useMemo, useState } from 'react';
import './App.css';

const localDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const nextDay = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return localDate(date);
};

const formatDate = (date) => {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
};

const formatPrice = (price) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(price));

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return null;

  const data = await response.json();
  if (!response.ok) throw new Error(data.erreur || 'Une erreur est survenue.');
  return data;
}

function App() {
  const [velos, setVelos] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [utilisateur, setUtilisateur] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [veloSelectionne, setVeloSelectionne] = useState(null);
  const [date, setDate] = useState(nextDay);
  const [creneaux, setCreneaux] = useState([]);
  const [debut, setDebut] = useState('');
  const [fin, setFin] = useState('');
  const [chargementCreneaux, setChargementCreneaux] = useState(false);
  const [chargementReservations, setChargementReservations] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [typeFiltre, setTypeFiltre] = useState('Tous');
  const [budget, setBudget] = useState('');
  const [modalCompte, setModalCompte] = useState(false);
  const [modeCompte, setModeCompte] = useState('connexion');
  const [message, setMessage] = useState('');
  const [erreurCompte, setErreurCompte] = useState('');
  const [envoiCompte, setEnvoiCompte] = useState(false);
  const [reservationEnCours, setReservationEnCours] = useState(false);

  useEffect(() => {
    async function initialiser() {
      try {
        const [velosData, sessionData] = await Promise.all([
          api('/api/velos'),
          api('/api/session').catch((error) => {
            if (error.message.includes('Connectez-vous') || error.message.includes('session a expiré')) {
              return null;
            }
            throw error;
          }),
        ]);
        setVelos(velosData);
        if (sessionData?.utilisateur) {
          setChargementReservations(true);
          setUtilisateur(sessionData.utilisateur);
        }
      } catch {
        setErreur('Impossible de charger l’application. Vérifiez que le serveur Express et PostgreSQL fonctionnent.');
      } finally {
        setChargement(false);
      }
    }

    initialiser();
  }, []);

  useEffect(() => {
    if (!veloSelectionne) return undefined;
    const controller = new AbortController();

    api(`/api/velos/${veloSelectionne.id}/disponibilites?date=${date}`, {
      signal: controller.signal,
    })
      .then((data) => setCreneaux(data.slots))
      .catch((error) => {
        if (error.name !== 'AbortError') setMessage(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setChargementCreneaux(false);
      });

    return () => controller.abort();
  }, [veloSelectionne, date]);

  useEffect(() => {
    if (!utilisateur) return;
    api('/api/reservations')
      .then(setReservations)
      .catch((error) => setMessage(error.message))
      .finally(() => setChargementReservations(false));
  }, [utilisateur]);

  const types = useMemo(() => ['Tous', ...new Set(velos.map((velo) => velo.type))], [velos]);
  const velosFiltres = useMemo(() => {
    const terme = recherche.trim().toLocaleLowerCase('fr');
    return velos.filter((velo) => {
      const correspondRecherche = !terme ||
        `${velo.nom} ${velo.type} ${velo.description}`.toLocaleLowerCase('fr').includes(terme);
      return correspondRecherche &&
        (typeFiltre === 'Tous' || velo.type === typeFiltre) &&
        (budget === '' || Number(velo.tarif) <= Number(budget));
    });
  }, [velos, recherche, typeFiltre, budget]);

  const debutHeure = debut ? Number(debut.slice(0, 2)) : null;
  const finsDisponibles = debutHeure
    ? Array.from({ length: 18 - debutHeure }, (_, index) => debutHeure + index + 1)
      .filter((heureFin) => creneaux
        .filter((creneau) => {
          const heure = Number(creneau.heure.slice(0, 2));
          return heure >= debutHeure && heure < heureFin;
        })
        .every((creneau) => creneau.disponible))
    : [];
  const duree = debut && fin ? Number(fin.slice(0, 2)) - Number(debut.slice(0, 2)) : 0;
  const prixEstime = veloSelectionne && duree
    ? (Number(veloSelectionne.tarif) * duree) / 9
    : 0;

  async function chargerReservations() {
    setReservations(await api('/api/reservations'));
  }

  async function envoyerCompte(event) {
    event.preventDefault();
    setErreurCompte('');
    setEnvoiCompte(true);
    const formData = new FormData(event.currentTarget);
    const payload = {
      email: formData.get('email'),
      motDePasse: formData.get('motDePasse'),
    };
    if (modeCompte === 'inscription') payload.nom = formData.get('nom');

    try {
      const data = await api(`/api/${modeCompte}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setChargementReservations(true);
      setUtilisateur(data.utilisateur);
      setModalCompte(false);
      setMessage(`Bienvenue${data.utilisateur.nom ? `, ${data.utilisateur.nom}` : ''} !`);
    } catch (error) {
      setErreurCompte(error.message);
    } finally {
      setEnvoiCompte(false);
    }
  }

  async function seDeconnecter() {
    try {
      await api('/api/deconnexion', { method: 'POST' });
      setUtilisateur(null);
      setReservations([]);
      setMessage('Vous êtes déconnecté.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function reserver(event) {
    event.preventDefault();
    if (!utilisateur) {
      setModeCompte('connexion');
      setModalCompte(true);
      return;
    }

    setReservationEnCours(true);
    setMessage('');
    try {
      await api('/api/reservations', {
        method: 'POST',
        body: JSON.stringify({
          veloId: veloSelectionne.id,
          date,
          heureDebut: debut,
          heureFin: fin,
        }),
      });
      setVeloSelectionne(null);
      setDebut('');
      setFin('');
      setMessage('Votre réservation est confirmée. Retrouvez-la dans votre espace personnel.');
      await chargerReservations();
    } catch (error) {
      setMessage(error.message);
      if (error.message.includes('vient d’être réservé')) {
        const data = await api(`/api/velos/${veloSelectionne.id}/disponibilites?date=${date}`);
        setCreneaux(data.slots);
      }
    } finally {
      setReservationEnCours(false);
    }
  }

  async function annulerReservation(id) {
    if (!window.confirm('Voulez-vous vraiment annuler cette réservation ?')) return;
    try {
      await api(`/api/reservations/${id}`, { method: 'DELETE' });
      await chargerReservations();
      setMessage('La réservation a été annulée.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="application">
      <header className="entete">
        <a className="logo" href="#" aria-label="VéloLoc, accueil">
          <span className="logo-icone" aria-hidden="true">↗</span> VéloLoc
        </a>
        <nav aria-label="Navigation principale">
          <a href="#velos">Nos vélos</a>
          <a href="#fonctionnement">Comment ça marche</a>
          {utilisateur && <a href="#mes-reservations">Mes réservations</a>}
        </nav>
        {utilisateur ? (
          <div className="compte-entete">
            <span className="avatar" aria-hidden="true">{utilisateur.nom?.[0]?.toUpperCase()}</span>
            <span className="nom-utilisateur">{utilisateur.nom}</span>
            <button className="bouton discret" onClick={seDeconnecter}>Déconnexion</button>
          </div>
        ) : (
          <button
            className="bouton discret"
            onClick={() => { setModeCompte('connexion'); setModalCompte(true); }}
          >
            Se connecter
          </button>
        )}
      </header>

      <main>
        <section className="accueil">
          <div className="accueil-contenu">
            <p className="surtitre"><span /> LA LIBERTÉ SUR DEUX ROUES</p>
            <h1>La ville vous appartient.</h1>
            <p className="introduction">
              Choisissez votre vélo, réservez votre créneau en quelques clics,
              et partez à la découverte de nouveaux horizons.
            </p>
            <a className="bouton principal" href="#velos">Trouver mon vélo <span aria-hidden="true">→</span></a>
            <div className="arguments">
              <span><b>01</b> Réservation simple</span>
              <span><b>02</b> Horaires flexibles</span>
              <span><b>03</b> Liberté totale</span>
            </div>
          </div>
          <div className="visuel-accueil" aria-hidden="true">
            <div className="soleil" />
            <div className="cercle-velo cercle-velo-un" />
            <div className="cercle-velo cercle-velo-deux" />
            <div className="illustration-principale">🚲</div>
            <span className="etiquette-flottante">Prêt pour l’aventure ?</span>
          </div>
        </section>

        {message && (
          <div className="message-global" role="status">
            <span>{message}</span>
            <button aria-label="Fermer le message" onClick={() => setMessage('')}>×</button>
          </div>
        )}

        <section className="section-velos" id="velos">
          <div className="entete-section">
            <div>
              <p className="surtitre">VOTRE PROCHAINE SORTIE</p>
              <h2>Choisissez votre monture<span className="point">.</span></h2>
              <p className="sous-titre">Des vélos entretenus, prêts à vous accompagner.</p>
            </div>
            {!chargement && <span className="compteur-velos">{velosFiltres.length} vélo{velosFiltres.length !== 1 ? 's' : ''}</span>}
          </div>

          <div className="filtres">
            <label className="champ-recherche">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Rechercher un vélo..."
                value={recherche}
                onChange={(event) => setRecherche(event.target.value)}
              />
            </label>
            <label>
              <span className="visuellement-cache">Catégorie</span>
              <select value={typeFiltre} onChange={(event) => setTypeFiltre(event.target.value)}>
                {types.map((type) => <option key={type} value={type}>{type === 'Tous' ? 'Toutes catégories' : type}</option>)}
              </select>
            </label>
            <label className="filtre-budget">
              <span>Budget max.</span>
              <input
                type="number"
                min="0"
                placeholder="Illimité"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
              />
              <span>€ / jour</span>
            </label>
          </div>

          {chargement && <p className="etat-vide">Chargement des vélos...</p>}
          {!chargement && erreur && <p className="etat-vide" role="alert">{erreur}</p>}
          {!chargement && !erreur && velosFiltres.length === 0 && (
            <p className="etat-vide">Aucun vélo ne correspond à ces critères. Essayez d’ajuster vos filtres.</p>
          )}

          {!chargement && !erreur && velosFiltres.length > 0 && (
            <div className="grille-velos">
              {velosFiltres.map((velo, index) => (
                <article className="carte-velo" key={velo.id}>
                  <div className={`illustration-velo illustration-${index % 3}`}>
                    <span className="etiquette carte-type">{velo.type}</span>
                    <span className="emoji-velo" aria-hidden="true">
                      {velo.type === 'Ville'
                        ? '🚲'
                        : velo.type === 'Électrique'
                          ? '⚡'
                          : velo.nom === 'Vélo de route'
                            ? '🚴'
                            : '⛰️'}
                    </span>
                    <span className="reflet-illustration" aria-hidden="true" />
                  </div>
                  <div className="contenu-carte">
                    <h3>{velo.nom}</h3>
                    <p className="description">{velo.description || 'Découvrez ce vélo pour votre prochaine sortie.'}</p>
                    <div className="bas-carte">
                      <p className="tarif">{formatPrice(velo.tarif)} <span>/ jour</span></p>
                      <button
                        className="bouton bouton-carte"
                        onClick={() => {
                          setVeloSelectionne(velo);
                          setCreneaux([]);
                          setDebut('');
                          setFin('');
                          setChargementCreneaux(true);
                          setMessage('');
                        }}
                      >
                        Réserver <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {veloSelectionne && (
          <div className="voile" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) setVeloSelectionne(null);
          }}>
            <section className="panneau-reservation" role="dialog" aria-modal="true" aria-labelledby="titre-reservation">
              <button className="fermer-modal" aria-label="Fermer" onClick={() => setVeloSelectionne(null)}>×</button>
              <p className="surtitre">VOTRE PROCHAINE SORTIE</p>
              <h2 id="titre-reservation">Réserver {veloSelectionne.nom}</h2>
              <p className="sous-titre">{formatPrice(veloSelectionne.tarif)} par journée de 9 heures</p>
              <form onSubmit={reserver}>
                <label className="champ-formulaire">
                  Date de location
                  <input
                    type="date"
                    required
                    min={localDate()}
                    value={date}
                    onChange={(event) => {
                      setDate(event.target.value);
                      setCreneaux([]);
                      setDebut('');
                      setFin('');
                      setChargementCreneaux(true);
                    }}
                  />
                </label>
                <div className="horaires-disponibles">
                  <div className="titre-horaires">
                    <strong>Horaires disponibles</strong>
                    <span>De 9 h à 18 h</span>
                  </div>
                  {chargementCreneaux ? <p>Recherche des disponibilités...</p> : (
                    <div className="liste-creneaux">
                      {creneaux.map((creneau) => (
                        <span
                          className={`creneau ${creneau.disponible ? 'disponible' : 'indisponible'}`}
                          key={creneau.heure}
                          title={creneau.disponible ? `${creneau.heure} disponible` : `${creneau.heure} indisponible`}
                        >
                          {creneau.heure}
                        </span>
                      ))}
                    </div>
                  )}
                  {!chargementCreneaux && creneaux.length > 0 && !creneaux.some((slot) => slot.disponible) && (
                    <p className="aide-formulaire">Il n’y a plus de créneau libre ce jour-là. Essayez une autre date.</p>
                  )}
                </div>
                <div className="champs-horaires">
                  <label className="champ-formulaire">
                    Début
                    <select required value={debut} onChange={(event) => { setDebut(event.target.value); setFin(''); }}>
                      <option value="">Choisir</option>
                      {creneaux.filter((slot) => slot.disponible).map((slot) => (
                        <option key={slot.heure} value={slot.heure}>{slot.heure}</option>
                      ))}
                    </select>
                  </label>
                  <label className="champ-formulaire">
                    Fin
                    <select required value={fin} onChange={(event) => setFin(event.target.value)} disabled={!debut}>
                      <option value="">Choisir</option>
                      {finsDisponibles.map((heure) => (
                        <option key={heure} value={`${String(heure).padStart(2, '0')}:00`}>
                          {String(heure).padStart(2, '0')}:00
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {duree > 0 && (
                  <div className="resume-prix">
                    <span>{duree} heure{duree > 1 ? 's' : ''} · {formatPrice(veloSelectionne.tarif)} / 9 h</span>
                    <strong>{formatPrice(prixEstime)}</strong>
                  </div>
                )}
                {!utilisateur && <p className="aide-formulaire">Un compte est nécessaire pour confirmer votre réservation.</p>}
                <button className="bouton bouton-confirmer" type="submit" disabled={!debut || !fin || chargementCreneaux || reservationEnCours}>
                  {reservationEnCours ? 'Réservation en cours...' : utilisateur ? 'Confirmer la réservation' : 'Se connecter pour réserver'}
                </button>
              </form>
            </section>
          </div>
        )}

        {utilisateur && (
          <section className="section-reservations" id="mes-reservations">
            <div className="entete-section">
              <div>
                <p className="surtitre">VOTRE ESPACE</p>
                <h2>Mes réservations<span className="point">.</span></h2>
              </div>
              <span className="compteur-velos">{reservations.length} réservation{reservations.length !== 1 ? 's' : ''}</span>
            </div>
            {chargementReservations ? <p className="etat-vide">Chargement de vos réservations...</p> : (
              reservations.length === 0
                ? <p className="etat-vide">Pas encore de réservation. Votre prochaine aventure vous attend !</p>
                : <div className="liste-reservations">
                  {reservations.map((reservation) => (
                    <article className={`ligne-reservation ${reservation.statut === 'annulee' ? 'reservation-annulee' : ''}`} key={reservation.id}>
                      <div className="icone-reservation" aria-hidden="true">🚲</div>
                      <div className="details-reservation">
                        <h3>{reservation.velo_nom}</h3>
                        <p>{formatDate(reservation.date_location)} · {reservation.heure_debut.slice(0, 5)} – {reservation.heure_fin.slice(0, 5)}</p>
                      </div>
                      <strong>{formatPrice(reservation.prix_total)}</strong>
                      {reservation.statut === 'annulee'
                        ? <span className="statut-reservation annulee">Annulée</span>
                        : <button className="bouton-annuler" onClick={() => annulerReservation(reservation.id)}>Annuler</button>}
                    </article>
                  ))}
                </div>
            )}
          </section>
        )}

        <section className="fonctionnement" id="fonctionnement">
          <div className="entete-section">
            <div>
              <p className="surtitre">SIMPLE COMME BONJOUR</p>
              <h2>En selle en 3 étapes<span className="point">.</span></h2>
            </div>
          </div>
          <div className="etapes">
            <article><span className="numero-etape">01</span><h3>Choisissez</h3><p>Trouvez le vélo qui correspond à votre envie du moment.</p></article>
            <article><span className="numero-etape">02</span><h3>Réservez</h3><p>Sélectionnez une date et vos horaires en un instant.</p></article>
            <article><span className="numero-etape">03</span><h3>Profitez</h3><p>Votre vélo vous attend. Il ne reste qu’à pédaler !</p></article>
          </div>
        </section>
      </main>

      <footer className="pied-page">
        <a className="logo" href="#">VéloLoc</a>
        <p>La liberté sur deux roues — Projet étudiant</p>
        <span>Fait pour prendre l’air. © {new Date().getFullYear()}</span>
      </footer>

      {modalCompte && (
        <div className="voile" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setModalCompte(false);
        }}>
          <section className="panneau-compte" role="dialog" aria-modal="true" aria-labelledby="titre-compte">
            <button className="fermer-modal" aria-label="Fermer" onClick={() => setModalCompte(false)}>×</button>
            <p className="surtitre">{modeCompte === 'inscription' ? 'BIENVENUE CHEZ VÉLOLOC' : 'HEUREUX DE VOUS REVOIR'}</p>
            <h2 id="titre-compte">{modeCompte === 'inscription' ? 'Créer un compte' : 'Connexion'}</h2>
            <p className="sous-titre">Retrouvez et gérez facilement vos réservations.</p>
            {erreurCompte && <p className="erreur-formulaire" role="alert">{erreurCompte}</p>}
            <form onSubmit={envoyerCompte}>
              {modeCompte === 'inscription' && (
                <label className="champ-formulaire">
                  Votre nom
                  <input name="nom" type="text" autoComplete="name" minLength="2" maxLength="80" required />
                </label>
              )}
              <label className="champ-formulaire">
                Adresse email
                <input name="email" type="email" autoComplete="email" maxLength="254" required />
              </label>
              <label className="champ-formulaire">
                Mot de passe
                <input
                  name="motDePasse"
                  type="password"
                  autoComplete={modeCompte === 'inscription' ? 'new-password' : 'current-password'}
                  minLength={modeCompte === 'inscription' ? 10 : 1}
                  maxLength="128"
                  required
                />
                {modeCompte === 'inscription' && <span className="aide-formulaire">10 caractères minimum</span>}
              </label>
              <button className="bouton bouton-confirmer" type="submit" disabled={envoiCompte}>
                {envoiCompte ? 'Veuillez patienter...' : modeCompte === 'inscription' ? 'Créer mon compte' : 'Me connecter'}
              </button>
            </form>
            <p className="bascule-compte">
              {modeCompte === 'inscription' ? 'Déjà un compte ?' : 'Pas encore de compte ?'}
              {' '}
              <button onClick={() => { setModeCompte(modeCompte === 'inscription' ? 'connexion' : 'inscription'); setErreurCompte(''); }}>
                {modeCompte === 'inscription' ? 'Se connecter' : 'Créer un compte'}
              </button>
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
