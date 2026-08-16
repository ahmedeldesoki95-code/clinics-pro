const logger = require('../utils/logger');
const chatStateService = require('./chatStateService');
const appointmentService = require('./appointmentService');
const { formatSlotLabel } = require('../utils/slotHelper');
const { sendTextMessage, jidToPhone } = require('../whatsapp/messageSender');

const RESET_KEYWORDS = ['menu', 'hi', 'hello', 'start', 'مرحبا', 'menu كل', '0'];
const MAX_DAYS_SHOWN = 5;
const MAX_SLOTS_SHOWN = 8;

function reply(sock, remoteJid, text) {
  return sendTextMessage(sock, remoteJid, text);
}

function mainMenuText() {
  return (
    'أهلاً بك! كيف يمكننا مساعدتك؟ 🏥\n\n' +
    '1️⃣ حجز موعد جديد\n' +
    '2️⃣ عرض موعدي\n' +
    '3️⃣ إلغاء موعدي\n' +
    '4️⃣ تعديل موعدي\n\n' +
    'اختر الرقم المناسب. اكتب "menu" للعودة للقائمة الرئيسية.'
  );
}

async function showMainMenu(sock, remoteJid, clinicId, patientPhone) {
  await chatStateService.setState(clinicId, patientPhone, 'MAIN_MENU', {});
  await reply(sock, remoteJid, mainMenuText());
}

async function startBookingFlow(sock, remoteJid, clinicId, patientPhone) {
  const availableDays = await appointmentService.getAvailableSlots(clinicId, { daysAhead: 14 });

  if (availableDays.length === 0) {
    await reply(sock, remoteJid, 'عذراً، لا توجد مواعيد متاحة في الأسبوعين القادمين. يرجى التواصل مع العيادة مباشرة.');
    await showMainMenu(sock, remoteJid, clinicId, patientPhone);
    return;
  }

  const shown = availableDays.slice(0, MAX_DAYS_SHOWN);
  const lines = shown.map((d, idx) => `${idx + 1}️⃣ ${formatSlotLabel(d.date).split(',')[0]} (${d.slots.length} موعد متاح)`);

  await chatStateService.setState(clinicId, patientPhone, 'AWAITING_DATE_SELECTION', {
    dayOptions: shown.map((d) => d.date.toISOString()),
  });

  await reply(
    sock,
    remoteJid,
    `رائع! اختر اليوم المناسب لموعدك:\n\n${lines.join('\n')}\n\nاكتب الرقم، أو "menu" للإلغاء.`
  );
}

async function handleDateSelection(sock, remoteJid, clinicId, patientPhone, text, state) {
  const choice = parseInt(text, 10);
  const dayOptions = state.metadata.dayOptions || [];

  if (!Number.isInteger(choice) || choice < 1 || choice > dayOptions.length) {
    await reply(sock, remoteJid, `الرجاء الرد برقم صحيح بين 1 و ${dayOptions.length}.`);
    return;
  }

  const chosenDate = new Date(dayOptions[choice - 1]);
  const availableDays = await appointmentService.getAvailableSlots(clinicId, { daysAhead: 14 });
  const dayMatch = availableDays.find((d) => +d.date === +chosenDate);

  if (!dayMatch || dayMatch.slots.length === 0) {
    await reply(sock, remoteJid, 'عذراً، هذا اليوم لم يعد متاحاً. دعنا نحاول مرة أخرى.');
    await startBookingFlow(sock, remoteJid, clinicId, patientPhone);
    return;
  }

  const shownSlots = dayMatch.slots.slice(0, MAX_SLOTS_SHOWN);
  const lines = shownSlots.map((s, idx) => `${idx + 1}️⃣ ${formatSlotLabel(s).split(', ')[1]}`);

  await chatStateService.setState(clinicId, patientPhone, 'AWAITING_TIME_SELECTION', {
    ...state.metadata,
    timeOptions: shownSlots.map((s) => s.toISOString()),
  });

  await reply(
    sock,
    remoteJid,
    `الأوقات المتاحة في ${formatSlotLabel(chosenDate).split(',')[0]}:\n\n${lines.join('\n')}\n\nاكتب الرقم، أو "menu" للإلغاء.`
  );
}

async function handleTimeSelection(sock, remoteJid, clinicId, patientPhone, text, state) {
  const choice = parseInt(text, 10);
  const timeOptions = state.metadata.timeOptions || [];

  if (!Number.isInteger(choice) || choice < 1 || choice > timeOptions.length) {
    await reply(sock, remoteJid, `الرجاء الرد برقم صحيح بين 1 و ${timeOptions.length}.`);
    return;
  }

  const chosenTime = timeOptions[choice - 1];

  await chatStateService.setState(clinicId, patientPhone, 'AWAITING_NAME', {
    ...state.metadata,
    selectedTime: chosenTime,
  });

  await reply(sock, remoteJid, 'اختيار ممتاز! ما الاسم الذي سنحجز به الموعد؟');
}

async function handleNameInput(sock, remoteJid, clinicId, patientPhone, text, state) {
  const name = text.trim();
  if (name.length < 2) {
    await reply(sock, remoteJid, 'الرجاء إدخال اسم صحيح (حرفين على الأقل).');
    return;
  }

  const selectedTime = new Date(state.metadata.selectedTime);

  await chatStateService.setState(clinicId, patientPhone, 'AWAITING_CONFIRMATION', {
    ...state.metadata,
    patientName: name,
  });

  await reply(
    sock,
    remoteJid,
    `الرجاء تأكيد موعدك:\n\n👤 الاسم: ${name}\n🗓️ ${formatSlotLabel(selectedTime)}\n\n1️⃣ تأكيد\n2️⃣ إلغاء`
  );
}

async function handleBookingConfirmation(sock, remoteJid, clinicId, patientPhone, text, state) {
  const choice = text.trim();

  if (choice === '2') {
    await reply(sock, remoteJid, 'لا مشكلة، لم يتم إنشاء الحجز.');
    await showMainMenu(sock, remoteJid, clinicId, patientPhone);
    return;
  }

  if (choice !== '1') {
    await reply(sock, remoteJid, 'الرجاء الرد بـ 1 للتأكيد أو 2 للإلغاء.');
    return;
  }

  try {
    const appointment = await appointmentService.bookAppointment({
      clinicId,
      patientPhone,
      patientName: state.metadata.patientName,
      appointmentTime: state.metadata.selectedTime,
    });
    await appointmentService.confirmAppointment(appointment.id);

    await reply(
      sock,
      remoteJid,
      `✅ تم تأكيد موعدك في ${formatSlotLabel(new Date(appointment.appointmentTime))}. نتطلع لرؤيتك!`
    );
  } catch (err) {
    if (err.statusCode === 409) {
      await reply(sock, remoteJid, '⚠️ عذراً، هذا الموعد تم حجزه للتو. دعنا نختار وقتاً آخر.');
      await startBookingFlow(sock, remoteJid, clinicId, patientPhone);
      return;
    }
    logger.error({ err }, 'Booking failed');
    await reply(sock, remoteJid, 'حدث خطأ أثناء الحجز. الرجاء المحاولة مرة أخرى قريباً.');
  }

  await showMainMenu(sock, remoteJid, clinicId, patientPhone);
}

async function handleViewAppointment(sock, remoteJid, clinicId, patientPhone) {
  const appt = await appointmentService.findLatestActiveAppointmentForPatient(clinicId, patientPhone);
  if (!appt) {
    await reply(sock, remoteJid, 'ليس لديك مواعيد قادمة محجوزة معنا.');
  } else {
    await reply(
      sock,
      remoteJid,
      `📋 موعدك القادم:\n\n👤 ${appt.patientName}\n🗓️ ${formatSlotLabel(appt.appointmentTime)}\n📌 الحالة: ${appt.status}`
    );
  }
  await showMainMenu(sock, remoteJid, clinicId, patientPhone);
}

async function startCancelFlow(sock, remoteJid, clinicId, patientPhone) {
  const appt = await appointmentService.findLatestActiveAppointmentForPatient(clinicId, patientPhone);
  if (!appt) {
    await reply(sock, remoteJid, 'ليس لديك مواعيد قادمة للإلغاء.');
    await showMainMenu(sock, remoteJid, clinicId, patientPhone);
    return;
  }

  await chatStateService.setState(clinicId, patientPhone, 'AWAITING_CONFIRMATION', {
    action: 'CANCEL',
    appointmentId: appt.id,
  });

  await reply(
    sock,
    remoteJid,
    `هل أنت متأكد من إلغاء موعدك في ${formatSlotLabel(appt.appointmentTime)}؟\n\n1️⃣ نعم، إلغاء\n2️⃣ لا، الإبقاء عليه`
  );
}

async function handleCancelConfirmation(sock, remoteJid, clinicId, patientPhone, text, state) {
  const choice = text.trim();
  if (choice === '1') {
    await appointmentService.cancelAppointment(state.metadata.appointmentId);
    await reply(sock, remoteJid, '❌ تم إلغاء موعدك.');
  } else {
    await reply(sock, remoteJid, 'حسناً، موعدك لا يزال محجوزاً.');
  }
  await showMainMenu(sock, remoteJid, clinicId, patientPhone);
}

async function startRescheduleFlow(sock, remoteJid, clinicId, patientPhone) {
  const appt = await appointmentService.findLatestActiveAppointmentForPatient(clinicId, patientPhone);
  if (!appt) {
    await reply(sock, remoteJid, 'You have no upcoming appointments to reschedule.');
    await showMainMenu(sock, remoteJid, clinicId, patientPhone);
    return;
  }

  const availableDays = await appointmentService.getAvailableSlots(clinicId, { daysAhead: 14 });
  if (availableDays.length === 0) {
    await reply(sock, remoteJid, 'Sorry, there are no other available slots right now.');
    await showMainMenu(sock, remoteJid, clinicId, patientPhone);
    return;
  }

  const shown = availableDays.slice(0, MAX_DAYS_SHOWN);
  const lines = shown.map((d, idx) => `${idx + 1}️⃣ ${formatSlotLabel(d.date).split(',')[0]} (${d.slots.length} slots)`);

  await chatStateService.setState(clinicId, patientPhone, 'AWAITING_RESCHEDULE_TIME', {
    action: 'RESCHEDULE',
    appointmentId: appt.id,
    dayOptions: shown.map((d) => d.date.toISOString()),
    stage: 'DATE',
  });

  await reply(
    sock,
    remoteJid,
    `Let's find a new time. Current appointment: ${formatSlotLabel(appt.appointmentTime)}\n\nChoose a new day:\n\n${lines.join('\n')}\n\nOr type "menu" to cancel.`
  );
}

async function handleRescheduleFlow(sock, remoteJid, clinicId, patientPhone, text, state) {
  const meta = state.metadata;

  if (meta.stage === 'DATE') {
    const choice = parseInt(text, 10);
    const dayOptions = meta.dayOptions || [];
    if (!Number.isInteger(choice) || choice < 1 || choice > dayOptions.length) {
      await reply(sock, remoteJid, `Please reply with a valid number between 1 and ${dayOptions.length}.`);
      return;
    }
    const chosenDate = new Date(dayOptions[choice - 1]);
    const availableDays = await appointmentService.getAvailableSlots(clinicId, { daysAhead: 14 });
    const dayMatch = availableDays.find((d) => +d.date === +chosenDate);

    if (!dayMatch || dayMatch.slots.length === 0) {
      await reply(sock, remoteJid, 'That day is no longer available.');
      await startRescheduleFlow(sock, remoteJid, clinicId, patientPhone);
      return;
    }

    const shownSlots = dayMatch.slots.slice(0, MAX_SLOTS_SHOWN);
    const lines = shownSlots.map((s, idx) => `${idx + 1}️⃣ ${formatSlotLabel(s).split(', ')[1]}`);

    await chatStateService.setState(clinicId, patientPhone, 'AWAITING_RESCHEDULE_TIME', {
      ...meta,
      stage: 'TIME',
      timeOptions: shownSlots.map((s) => s.toISOString()),
    });

    await reply(sock, remoteJid, `Available times:\n\n${lines.join('\n')}\n\nReply with the number, or type "menu" to cancel.`);
    return;
  }

  if (meta.stage === 'TIME') {
    const choice = parseInt(text, 10);
    const timeOptions = meta.timeOptions || [];
    if (!Number.isInteger(choice) || choice < 1 || choice > timeOptions.length) {
      await reply(sock, remoteJid, `Please reply with a valid number between 1 and ${timeOptions.length}.`);
      return;
    }
    const chosenTime = timeOptions[choice - 1];

    try {
      const updated = await appointmentService.rescheduleAppointment(meta.appointmentId, chosenTime);
      await appointmentService.confirmAppointment(updated.id);
      await reply(sock, remoteJid, `✅ Your appointment has been moved to ${formatSlotLabel(new Date(updated.appointmentTime))}.`);
    } catch (err) {
      if (err.statusCode === 409) {
        await reply(sock, remoteJid, '⚠️ Sorry, that slot was just taken. Let\'s try again.');
        await startRescheduleFlow(sock, remoteJid, clinicId, patientPhone);
        return;
      }
      logger.error({ err }, 'Reschedule failed');
      await reply(sock, remoteJid, 'Something went wrong while rescheduling. Please try again shortly.');
    }

    await showMainMenu(sock, remoteJid, clinicId, patientPhone);
  }
}

/**
 * Handles a patient's reply to an automated reminder message (sent by the
 * cron job). This is triggered when the chat state is
 * AWAITING_REMINDER_RESPONSE, which reminderJob.js sets right after sending
 * the reminder.
 */
async function handleReminderResponse(sock, remoteJid, clinicId, patientPhone, text, state) {
  const choice = text.trim();
  const appointmentId = state.metadata.appointmentId;

  if (!appointmentId) {
    await showMainMenu(sock, remoteJid, clinicId, patientPhone);
    return;
  }

  if (choice === '1') {
    await appointmentService.confirmAppointment(appointmentId);
    await reply(sock, remoteJid, '✅ شكراً لك! تم تأكيد موعدك.');
  } else if (choice === '2') {
    await appointmentService.cancelAppointment(appointmentId);
    await reply(sock, remoteJid, '❌ تم إلغاء موعدك. يمكنك حجز موعد جديد في أي وقت.');
  } else {
    await reply(sock, remoteJid, 'الرجاء الرد بـ 1 للتأكيد أو 2 لإلغاء موعدك.');
    return;
  }

  await showMainMenu(sock, remoteJid, clinicId, patientPhone);
}

/**
 * Main entry point registered with whatsappManager. Routes an incoming
 * message to the correct state-machine handler based on the patient's
 * current conversational step.
 */
async function handleIncomingMessage({ clinicId, sock, remoteJid, text }) {
  const patientPhone = jidToPhone(remoteJid);
  const normalized = text.trim().toLowerCase();

  const state = await chatStateService.getState(clinicId, patientPhone);

  // Global reset command works from any step.
  if (RESET_KEYWORDS.includes(normalized)) {
    await showMainMenu(sock, remoteJid, clinicId, patientPhone);
    return;
  }

  switch (state.currentStep) {
    case 'IDLE':
      await showMainMenu(sock, remoteJid, clinicId, patientPhone);
      return;

    case 'MAIN_MENU': {
      switch (normalized) {
        case '1':
          await startBookingFlow(sock, remoteJid, clinicId, patientPhone);
          break;
        case '2':
          await handleViewAppointment(sock, remoteJid, clinicId, patientPhone);
          break;
        case '3':
          await startCancelFlow(sock, remoteJid, clinicId, patientPhone);
          break;
        case '4':
          await startRescheduleFlow(sock, remoteJid, clinicId, patientPhone);
          break;
        default:
          await reply(sock, remoteJid, 'عذراً، لم أفهم ذلك.');
          await showMainMenu(sock, remoteJid, clinicId, patientPhone);
      }
      return;
    }

    case 'AWAITING_DATE_SELECTION':
      await handleDateSelection(sock, remoteJid, clinicId, patientPhone, normalized, state);
      return;

    case 'AWAITING_TIME_SELECTION':
      await handleTimeSelection(sock, remoteJid, clinicId, patientPhone, normalized, state);
      return;

    case 'AWAITING_NAME':
      await handleNameInput(sock, remoteJid, clinicId, patientPhone, text, state);
      return;

    case 'AWAITING_CONFIRMATION':
      if (state.metadata.action === 'CANCEL') {
        await handleCancelConfirmation(sock, remoteJid, clinicId, patientPhone, normalized, state);
      } else {
        await handleBookingConfirmation(sock, remoteJid, clinicId, patientPhone, normalized, state);
      }
      return;

    case 'AWAITING_RESCHEDULE_TIME':
      await handleRescheduleFlow(sock, remoteJid, clinicId, patientPhone, normalized, state);
      return;

    case 'AWAITING_REMINDER_RESPONSE':
      await handleReminderResponse(sock, remoteJid, clinicId, patientPhone, normalized, state);
      return;

    case 'AWAITING_WAITLIST_RESPONSE': {
      const waitlistService = require('./waitlistService');
      const result = await waitlistService.handleWaitlistReply({ clinicId, patientPhone, text: normalized, sock, remoteJid });
      if (!result.handled) {
        await showMainMenu(sock, remoteJid, clinicId, patientPhone);
      }
      return;
    }

    default:
      await showMainMenu(sock, remoteJid, clinicId, patientPhone);
  }
}

module.exports = { handleIncomingMessage };
