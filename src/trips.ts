export type Category = 'Heritage' | 'Workshops' | 'Outdoors'

export type Trip = {
  id: string
  name: string
  category: Category
  location: string
  duration: string
  time: string
  price: number
  capacity: number
  image: string
  alt: string
  line: string
  description: string
  includes: string[]
  meeting: string
  itinerary: string[]
}

const assets = import.meta.env.BASE_URL + 'images/'

export const trips: Trip[] = [
  {
    id: 'lodhi', name: 'Lodhi before the crowds', category: 'Heritage',
    location: 'Lodhi Garden, Delhi', duration: '2 hours', time: '8:00 AM',
    price: 750, capacity: 8, image: assets + 'lodhi.webp',
    alt: 'A domed sandstone tomb framed by trees in Lodhi Garden',
    line: 'A slow walk through tombs, trees and the stories between them.',
    description: 'Start at the gardens while they are still quiet. Walk between the monuments with a local host, pause for photographs and finish with chai near the gate.',
    includes: ['Local heritage host', 'Small-group walk', 'Chai after the walk'],
    meeting: 'Meet your host at Lodhi Garden Gate 1.',
    itinerary: ['Meet at the garden gate', 'Walk the tomb and garden circuit', 'Finish with chai near the gate'],
  },
  {
    id: 'pottery', name: 'Hands in clay', category: 'Workshops',
    location: 'Shahpur Jat, Delhi', duration: '2.5 hours', time: '11:00 AM',
    price: 1450, capacity: 6, image: assets + 'pottery.webp',
    alt: 'Potter’s hands shaping a clay bowl on a wheel',
    line: 'Make something imperfect and lovely on a potter’s wheel.',
    description: 'Learn how to center clay, pull the walls of a bowl and shape its rim in a small studio. The session is set up for first-timers, and your piece will be fired after the workshop.',
    includes: ['Wheel and tools', 'Clay and firing', 'Guidance from a studio potter'],
    meeting: 'Meet your host at the demo studio in Shahpur Jat.',
    itinerary: ['Meet the potter and learn the wheel', 'Shape and trim your own bowl', 'Leave your piece at the studio for firing'],
  },
  {
    id: 'wetlands', name: 'A morning in the reeds', category: 'Outdoors',
    location: 'Okhla Bird Sanctuary, Noida', duration: '3 hours', time: '7:00 AM',
    price: 950, capacity: 8, image: assets + 'wetlands.webp',
    alt: 'Reeds and birds over a quiet wetland at first light',
    line: 'An early start for still water, birdsong and a little fresh air.',
    description: 'Follow the wetland trail with a nature guide and stop at viewpoints to look for waterbirds. Bring water and comfortable shoes. The pace suits beginners.',
    includes: ['Nature guide', 'Binoculars to share', 'Sanctuary entry'],
    meeting: 'Meet your guide outside the Okhla Bird Sanctuary ticket gate.',
    itinerary: ['Meet at the sanctuary gate', 'Follow the reed-lined trail', 'Stop at the wetlands viewpoints'],
  },
]

export type Booking = { id: string; trip: string; date: string; guests: number }

export const money = (amount: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(amount)

const indiaDate = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
})
const label = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short',
})

export function weekendDates(now = new Date()) {
  const parts = Object.fromEntries(indiaDate.formatToParts(now).map(part => [part.type, part.value]))
  const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + 1, 12))
  const dates: string[] = []
  while (dates.length < 4) {
    if (date.getUTCDay() === 0 || date.getUTCDay() === 6) dates.push(date.toISOString().slice(0, 10))
    date.setUTCDate(date.getUTCDate() + 1)
  }
  return dates
}

export function dateLabel(date: string) {
  return label.format(new Date(date + 'T12:00:00Z'))
}

export function seatsLeft(trip: Trip, date: string, bookings: Booking[]) {
  const reserved = bookings.filter(booking => booking.trip === trip.id && booking.date === date)
    .reduce((total, booking) => total + booking.guests, 0)
  return Math.max(0, trip.capacity - reserved)
}
