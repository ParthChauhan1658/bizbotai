import { db, services, appointments, businesses } from '@bizbot/database'
import { eq, and, ilike, ne } from 'drizzle-orm'

interface CheckAvailabilityInput {
  businessId: string
  service_name: string
  date: string
  preferred_time?: string
}

interface BusinessHours {
  open: string
  close: string
  closed: boolean
}

function generateSlots(open: string, close: string, durationMins: number): string[] {
  const slots: string[] = []
  const [openH, openM] = open.split(':').map(Number)
  const [closeH, closeM] = close.split(':').map(Number)
  const openTotal = openH! * 60 + openM!
  const closeTotal = closeH! * 60 + closeM!

  for (let t = openTotal; t + durationMins <= closeTotal; t += durationMins) {
    const h = Math.floor(t / 60)
    const m = t % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
  return slots
}

function timeToMins(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h! * 60 + m!
}

export async function checkAvailability(input: CheckAvailabilityInput) {
  const { businessId, service_name, date, preferred_time } = input

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
    // Return all available services for helpful message
    const allServices = await db
      .select({ name: services.name })
      .from(services)
      .where(and(eq(services.businessId, businessId), eq(services.isActive, true)))

    const names = allServices.map(s => s.name).join(', ')
    return {
      available: false,
      message: `Service not found. Available services: ${names || 'none'}`,
    }
  }

  const service = serviceRows[0]!

  // 2. Get business hours for the day
  const [businessRow] = await db
    .select({ businessHours: businesses.businessHours })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1)

  const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' })
  const hours = businessRow?.businessHours as Record<string, BusinessHours> | null
  const dayHours = hours?.[dayName]

  if (!dayHours || dayHours.closed) {
    return {
      available: false,
      message: `We are closed on ${dayName}. Please choose another day.`,
    }
  }

  // 3. Get existing appointments for that date (not cancelled)
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

  // 4. Generate all possible slots
  const allSlots = generateSlots(dayHours.open, dayHours.close, service.durationMins)

  // 5. Filter out conflicting slots
  const availableSlots = allSlots.filter(slot => {
    const slotStart = timeToMins(slot)
    const slotEnd = slotStart + service.durationMins
    return !existingAppointments.some(appt => {
      const apptStart = timeToMins(appt.startTime)
      const apptEnd = timeToMins(appt.endTime)
      // Overlap check: slot overlaps with appt if slotStart < apptEnd && slotEnd > apptStart
      return slotStart < apptEnd && slotEnd > apptStart
    })
  })

  // 6. If preferred_time provided, sort by proximity
  let sortedSlots = availableSlots
  if (preferred_time) {
    const prefMins = timeToMins(preferred_time)
    sortedSlots = [...availableSlots].sort((a, b) => {
      return Math.abs(timeToMins(a) - prefMins) - Math.abs(timeToMins(b) - prefMins)
    })
  }

  return {
    available: sortedSlots.length > 0,
    service: {
      name: service.name,
      durationMins: service.durationMins,
      price: service.price,
    },
    date,
    slots: sortedSlots,
    message: sortedSlots.length > 0
      ? `Available slots for ${service.name} on ${date}: ${sortedSlots.join(', ')}`
      : `No available slots for ${service.name} on ${date}.`,
  }
}
