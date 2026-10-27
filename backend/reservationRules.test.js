const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidDate, validateReservation } = require('./reservationRules');

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
