const {
  addMinutes,
  format,
  isBefore,
  isAfter,
  parse,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  startOfDay,
  endOfDay,
} = require('date-fns');

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * Expected shape of `clinic.workingHours` (JSON column):
 * {
 *   "sun": [{ "start": "09:00", "end": "17:00" }],
 *   "mon": [{ "start": "09:00", "end": "13:00" }, { "start": "16:00", "end": "20:00" }],
 *   "tue": [],
 *   ...
 * }
 * An empty array (or missing key) means the clinic is closed that day.
 */

function dayKeyFor(date) {
  return DAY_KEYS[date.getDay()];
}

function combineDateAndTime(baseDate, hhmm) {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return setMilliseconds(setSeconds(setMinutes(setHours(baseDate, hours), minutes), 0), 0);
}

/**
 * Generates every discrete slot start-time for a given calendar date,
 * based on the clinic's working hours and slot duration, excluding any
 * slot that falls in the past relative to `now`.
 */
function generateSlotsForDay(clinic, date, now = new Date()) {
  const ranges = (clinic.workingHours && clinic.workingHours[dayKeyFor(date)]) || [];
  const duration = clinic.slotDurationMinutes || 30;
  const slots = [];

  for (const range of ranges) {
    if (!range.start || !range.end) continue;
    let cursor = combineDateAndTime(date, range.start);
    const rangeEnd = combineDateAndTime(date, range.end);

    while (isBefore(addMinutes(cursor, duration), rangeEnd) || +addMinutes(cursor, duration) === +rangeEnd) {
      if (isAfter(cursor, now)) {
        slots.push(new Date(cursor));
      }
      cursor = addMinutes(cursor, duration);
    }
  }

  return slots;
}

/**
 * Removes slots that are already booked (PENDING or CONFIRMED) for the clinic.
 */
function filterOutBookedSlots(slots, bookedAppointmentTimes) {
  const bookedSet = new Set(bookedAppointmentTimes.map((d) => +new Date(d)));
  return slots.filter((slot) => !bookedSet.has(+slot));
}

function formatSlotLabel(date, timezone = 'Africa/Cairo') {
  // Display-friendly label, e.g. "Mon 18 Aug, 10:30 AM"
  return format(date, 'EEE d MMM, hh:mm a');
}

function isValidTimeString(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

module.exports = {
  DAY_KEYS,
  dayKeyFor,
  combineDateAndTime,
  generateSlotsForDay,
  filterOutBookedSlots,
  formatSlotLabel,
  isValidTimeString,
  startOfDay,
  endOfDay,
};
