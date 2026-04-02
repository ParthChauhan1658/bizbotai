import { db, services, appointments, customers } from '@bizbot/database'
import { eq, and, ilike, ne, sql } from 'drizzle-orm'

interface CreateAppointmentInput {
  businessId: string
  customerId: string
  conversationId: string
  service_name: string
  date: string        // YYYY-MM-DD
  start_time: string  // HH:mm
  notes?: string
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h! * 60 + m! + mins
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function timeToMins(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h! * 60 + m!
}

export async function createAppointment(input: CreateAppointmentInput) {
  const { businessId, customerId, conversationId, service_name, date, start_time, notes } = input

  // 1. Find service by name (case-insensitive)
  const serviceRows = await db
    .select()
    .from(services)
    .where(and(
      eq(services.businessId, businessId),
      ilike(services.name, service_name),
      eq(services.isActive, true),
    ))
    .limit(1)

  if (serviceRows.length === 0) {
    return { success: false, error: `Service "${service_name}" not found.` }
  }

  const service = serviceRows[0]!

  // 2. Calculate end time
  const end_time = addMinutes(start_time, service.durationMins)

  // 3. Check for conflicts
  const existingAppointments = await db
    .select({
      startTime: appointments.startTime,
      endTime: appointments.endTime,
    })
    .from(appointments)
    .where(and(
      eq(appointments.businessId, businessId),
      eq(appointments.appointmentDate, date),
      ne(appointments.status, 'cancelled'),
    ))

  const newStart = timeToMins(start_time)
  const newEnd = timeToMins(end_time)

  const hasConflict = existingAppointments.some(appt => {
    const apptStart = timeToMins(appt.startTime)
    const apptEnd = timeToMins(appt.endTime)
    return newStart < apptEnd && newEnd > apptStart
  })

  if (hasConflict) {
    return { success: false, error: 'That slot is already booked. Try another time.' }
  }

  // 4. Insert appointment
  const [newAppt] = await db
    .insert(appointments)
    .values({
      businessId,
      customerId,
      conversationId,
      serviceId: service.id,
      serviceName: service.name,
      appointmentDate: date,
      startTime: start_time,
      endTime: end_time,
      durationMins: service.durationMins,
      status: 'pending',
      paymentStatus: 'unpaid',
      amount: service.price,
      notes: notes ?? null,
    })
    .returning({ id: appointments.id })

  // 5. Increment customer's totalAppointments counter
  await db
    .update(customers)
    .set({ totalAppointments: sql`${customers.totalAppointments} + 1` })
    .where(and(eq(customers.id, customerId), eq(customers.businessId, businessId)))

  return {
    success: true,
    appointmentId: newAppt?.id ?? '',
    date,
    startTime: start_time,
    endTime: end_time,
    serviceName: service.name,
    amount: service.price,
    message: `Appointment booked for ${date} at ${start_time}. Duration: ${service.durationMins} mins. Amount: ₹${service.price}`,
  }
}
