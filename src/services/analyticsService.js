const { subDays, startOfDay, endOfDay, format, eachDayOfInterval } = require('date-fns');
const { prisma } = require('../config/db');
const { getClinicById } = require('./clinicService');

const FINISHED_STATUSES = ['COMPLETED', 'CANCELLED', 'NO_SHOW'];

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Aggregates attendance/cancellation rates, estimated revenue, peak
 * booking hours, and a daily/weekly chart-ready summary for a clinic
 * over a given date range (defaults to the trailing 30 days).
 */
async function getClinicAnalytics(clinicId, { from, to } = {}) {
  const clinic = await getClinicById(clinicId);

  const rangeEnd = to ? endOfDay(new Date(to)) : endOfDay(new Date());
  const rangeStart = from ? startOfDay(new Date(from)) : startOfDay(subDays(rangeEnd, 29));

  const appointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      appointmentTime: { gte: rangeStart, lte: rangeEnd },
    },
    select: {
      id: true,
      appointmentTime: true,
      status: true,
      price: true,
    },
  });

  const totals = {
    total: appointments.length,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0,
  };

  let revenueTotal = 0;
  const hourCounts = new Map(); // hour (0-23) -> count
  const dayBuckets = new Map(); // 'yyyy-MM-dd' -> { total, completed, cancelled, noShow }
  const weekBuckets = new Map(); // 'yyyy-ww' -> { total, completed, cancelled, noShow }

  for (const appt of appointments) {
    switch (appt.status) {
      case 'PENDING':
        totals.pending += 1;
        break;
      case 'CONFIRMED':
        totals.confirmed += 1;
        break;
      case 'COMPLETED':
        totals.completed += 1;
        revenueTotal += appt.price ?? clinic.defaultPrice ?? 0;
        break;
      case 'CANCELLED':
        totals.cancelled += 1;
        break;
      case 'NO_SHOW':
        totals.noShow += 1;
        break;
      default:
        break;
    }

    const hour = new Date(appt.appointmentTime).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);

    const dayKey = format(new Date(appt.appointmentTime), 'yyyy-MM-dd');
    const weekKey = format(new Date(appt.appointmentTime), "RRRR-'W'II");

    if (!dayBuckets.has(dayKey)) dayBuckets.set(dayKey, { total: 0, completed: 0, cancelled: 0, noShow: 0 });
    if (!weekBuckets.has(weekKey)) weekBuckets.set(weekKey, { total: 0, completed: 0, cancelled: 0, noShow: 0 });

    const dayBucket = dayBuckets.get(dayKey);
    const weekBucket = weekBuckets.get(weekKey);
    dayBucket.total += 1;
    weekBucket.total += 1;
    if (appt.status === 'COMPLETED') { dayBucket.completed += 1; weekBucket.completed += 1; }
    if (appt.status === 'CANCELLED') { dayBucket.cancelled += 1; weekBucket.cancelled += 1; }
    if (appt.status === 'NO_SHOW') { dayBucket.noShow += 1; weekBucket.noShow += 1; }
  }

  const finishedCount = totals.completed + totals.cancelled + totals.noShow;
  const attendanceRate = finishedCount > 0 ? round((totals.completed / finishedCount) * 100) : 0;
  const cancellationRate = finishedCount > 0 ? round((totals.cancelled / finishedCount) * 100) : 0;
  const noShowRate = finishedCount > 0 ? round((totals.noShow / finishedCount) * 100) : 0;

  const peakHours = Array.from(hourCounts.entries())
    .map(([hour, count]) => ({ hour, label: formatHourLabel(hour), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Ensure every day in the requested range appears in the chart data,
  // even days with zero appointments, so the frontend chart has no gaps.
  const allDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  const dailySummary = allDays.map((day) => {
    const key = format(day, 'yyyy-MM-dd');
    const bucket = dayBuckets.get(key) || { total: 0, completed: 0, cancelled: 0, noShow: 0 };
    return { date: key, ...bucket };
  });

  const weeklySummary = Array.from(weekBuckets.entries())
    .map(([week, bucket]) => ({ week, ...bucket }))
    .sort((a, b) => (a.week > b.week ? 1 : -1));

  return {
    clinicId,
    range: { from: rangeStart.toISOString(), to: rangeEnd.toISOString() },
    totals,
    attendanceRate,
    cancellationRate,
    noShowRate,
    revenue: {
      total: round(revenueTotal, 2),
      currency: 'EGP',
      completedCount: totals.completed,
    },
    peakHours,
    dailySummary,
    weeklySummary,
  };
}

function formatHourLabel(hour) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
}

module.exports = { getClinicAnalytics };
