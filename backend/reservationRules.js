function isValidDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function validateReservation(input) {
  const veloId = Number(input.veloId);
  const { date, heureDebut, heureFin } = input;

  if (!Number.isInteger(veloId) || veloId < 1) {
    return { valid: false, erreur: 'Sélectionnez un vélo valide.' };
  }
  if (!isValidDate(date)) {
    return { valid: false, erreur: 'Sélectionnez une date valide.' };
  }
  if (
    typeof heureDebut !== 'string' || !/^([01]\d|2[0-3]):00$/.test(heureDebut) ||
    typeof heureFin !== 'string' || !/^([01]\d|2[0-3]):00$/.test(heureFin)
  ) {
    return { valid: false, erreur: 'Les horaires doivent correspondre à des heures pleines.' };
  }

  const start = Number(heureDebut.slice(0, 2));
  const end = Number(heureFin.slice(0, 2));
  if (start < 9 || end > 18 || start >= end) {
    return { valid: false, erreur: 'Choisissez un créneau entre 9 h et 18 h.' };
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (date < today || (date === today && start <= now.getHours())) {
    return { valid: false, erreur: 'Ce créneau est déjà passé. Choisissez une date ou une heure future.' };
  }

  return { valid: true, veloId, date, heureDebut, heureFin };
}

module.exports = { isValidDate, validateReservation };
