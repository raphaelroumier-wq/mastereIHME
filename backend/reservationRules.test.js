const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildAvailabilitySlots,
  hasCapacity,
  isValidDate,
  validateReservation,
} = require('./reservationRules');

test('accepts a calendar-valid date and rejects impossible dates', () => {
  assert.equal(isValidDate('2026-10-28'), true);
  assert.equal(isValidDate('2026-02-30'), false);
  assert.equal(isValidDate('28-10-2026'), false);
});

test('accepts a valid one-hour reservation', () => {
  const result = validateReservation({
    veloId: 2,
    date: '2099-10-28',
    heureDebut: '09:00',
    heureFin: '10:00',
  });
  assert.equal(result.valid, true);
  assert.equal(result.veloId, 2);
});

test('rejects invalid bikes, non-hourly times and time ranges outside opening hours', () => {
  const validInput = {
    veloId: 1,
    date: '2099-10-28',
    heureDebut: '09:00',
    heureFin: '10:00',
  };
  assert.equal(validateReservation({ ...validInput, veloId: 0 }).valid, false);
  assert.equal(validateReservation({ ...validInput, heureDebut: '09:30' }).valid, false);
  assert.equal(validateReservation({ ...validInput, heureDebut: '08:00' }).valid, false);
  assert.equal(validateReservation({ ...validInput, heureFin: '09:00' }).valid, false);
  assert.equal(validateReservation({ ...validInput, date: '2099-02-30' }).valid, false);
});

test('reports remaining stock per hour, including multi-hour reservations', () => {
  const slots = buildAvailabilitySlots(
    10,
    [
      { heure_debut: '09:00:00', heure_fin: '11:00:00' },
      { heure_debut: '10:00:00', heure_fin: '12:00:00' },
    ],
    '2099-10-28',
    new Date('2099-10-27T12:00:00'),
  );

  assert.deepEqual(
    slots.slice(0, 4).map(({ heure, restants, disponible }) => ({ heure, restants, disponible })),
    [
      { heure: '09:00', restants: 9, disponible: true },
      { heure: '10:00', restants: 8, disponible: true },
      { heure: '11:00', restants: 9, disponible: true },
      { heure: '12:00', restants: 10, disponible: true },
    ],
  );
});

test('allows bookings up to stock for every hour and rejects full overlapping hours', () => {
  const reservations = [
    { heure_debut: '09:00:00', heure_fin: '10:00:00' },
    { heure_debut: '10:00:00', heure_fin: '11:00:00' },
  ];

  assert.equal(hasCapacity(2, reservations, '09:00', '11:00'), true);
  assert.equal(hasCapacity(1, reservations, '09:00', '11:00'), false);
  assert.equal(hasCapacity(2, reservations, '11:00', '12:00'), true);
});
