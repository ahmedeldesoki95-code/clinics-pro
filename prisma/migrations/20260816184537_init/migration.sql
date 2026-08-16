-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('DISCONNECTED', 'CONNECTING', 'QR_PENDING', 'CONNECTED', 'LOGGED_OUT');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ChatStep" AS ENUM ('IDLE', 'MAIN_MENU', 'AWAITING_DATE_SELECTION', 'AWAITING_TIME_SELECTION', 'AWAITING_NAME', 'AWAITING_CONFIRMATION', 'AWAITING_RESCHEDULE_TIME', 'AWAITING_REMINDER_RESPONSE', 'AWAITING_WAITLIST_RESPONSE', 'BOOKED');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'NOTIFIED', 'CLAIMED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "clinics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "session_status" "SessionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "working_hours" JSONB NOT NULL,
    "slot_duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Cairo',
    "default_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_phone" TEXT NOT NULL,
    "patient_name" TEXT NOT NULL,
    "appointment_time" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "reminder_day_sent" BOOLEAN NOT NULL DEFAULT false,
    "reminder_2h_sent" BOOLEAN NOT NULL DEFAULT false,
    "price" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_states" (
    "id" TEXT NOT NULL,
    "patient_phone" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "current_step" "ChatStep" NOT NULL DEFAULT 'IDLE',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_phone" TEXT NOT NULL,
    "patient_name" TEXT NOT NULL,
    "desired_date" TIMESTAMP(3) NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "notified_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "offered_appointment_id" TEXT,
    "offered_slot_time" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinics_phone_number_key" ON "clinics"("phone_number");

-- CreateIndex
CREATE INDEX "appointments_clinic_id_appointment_time_idx" ON "appointments"("clinic_id", "appointment_time");

-- CreateIndex
CREATE INDEX "appointments_patient_phone_idx" ON "appointments"("patient_phone");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_clinic_id_appointment_time_key" ON "appointments"("clinic_id", "appointment_time");

-- CreateIndex
CREATE UNIQUE INDEX "chat_states_patient_phone_clinic_id_key" ON "chat_states"("patient_phone", "clinic_id");

-- CreateIndex
CREATE INDEX "waitlist_clinic_id_desired_date_status_idx" ON "waitlist"("clinic_id", "desired_date", "status");

-- CreateIndex
CREATE INDEX "waitlist_patient_phone_idx" ON "waitlist"("patient_phone");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_states" ADD CONSTRAINT "chat_states_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
