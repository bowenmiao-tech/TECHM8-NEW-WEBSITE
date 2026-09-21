// Repair booking windows, limited to a store's trading hours where those are defined here.
// Keep in sync with STORE_CHECKOUT_DETAILS (openingHours) and initBookingForm in script.js.

type BookingWindow = { label: string; start: number; end: number }

const bookingWindows: BookingWindow[] = [
  { label: 'Morning time', start: 9 * 60, end: 12 * 60 },
  { label: 'Lunch time', start: 12 * 60, end: 14 * 60 },
  { label: 'Afternoon time', start: 14 * 60, end: 17 * 60 },
]

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Trading hours by weekday (0 = Sunday, null = closed).
const storeOpeningHours: Record<string, { name: string; hours: Array<[string, string] | null> }> = {
  brassall: {
    name: 'Brassall',
    hours: [
      null,
      ['09:00', '17:00'],
      ['09:00', '17:30'],
      ['09:00', '17:30'],
      ['09:00', '17:30'],
      ['09:00', '17:30'],
      ['09:00', '16:30'],
    ],
  },
}

const clockMinutes = (clock: string) => {
  const [hours, minutes] = clock.split(':').map(Number)
  return hours * 60 + minutes
}

const formatClock = (minutes: number) =>
  `${Math.floor(minutes / 60) % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${minutes < 12 * 60 ? 'AM' : 'PM'}`

const windowValue = ({ label, start, end }: BookingWindow) => `${label} (${formatClock(start)} - ${formatClock(end)})`

// Accepted preferred_time values for a store on a YYYY-MM-DD date, plus the error to show
// when the store is closed that day or the chosen time falls outside its hours.
export function getBookingTimeRules(storeSlug: string, preferredDate: string) {
  const store = storeOpeningHours[storeSlug]
  if (!store) {
    return {
      allowed: new Set(bookingWindows.map(windowValue)),
      closedMessage: '',
      invalidMessage: 'Please choose a valid preferred time.',
    }
  }

  const [year, month, day] = preferredDate.split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  const hours = store.hours[weekday]
  if (!hours) {
    return {
      allowed: new Set<string>(),
      closedMessage: `${store.name} is closed on ${weekdays[weekday]}s. Please choose another day.`,
      invalidMessage: '',
    }
  }

  const [open, close] = hours.map(clockMinutes)
  const clipped = bookingWindows
    .map((window, index) => ({
      label: window.label,
      start: Math.max(window.start, open),
      end: index === bookingWindows.length - 1 ? close : Math.min(window.end, close),
    }))
    .filter((window) => window.start < window.end)
  // Standard windows that fit inside the day's hours stay valid for forms loaded before a change.
  const fitting = bookingWindows.filter((window) => window.start >= open && window.end <= close)

  return {
    allowed: new Set([...clipped, ...fitting].map(windowValue)),
    closedMessage: '',
    invalidMessage: `${store.name} is open ${formatClock(open)} - ${formatClock(close)} on ${weekdays[weekday]}s. Please choose a time within these hours.`,
  }
}
