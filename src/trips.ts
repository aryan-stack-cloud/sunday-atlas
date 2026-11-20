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
  },
  {
    id: 'pottery', name: 'Hands in clay', category: 'Workshops',
    location: 'Shahpur Jat, Delhi', duration: '2.5 hours', time: '11:00 AM',
    price: 1450, capacity: 6, image: assets + 'pottery.webp',
    alt: 'Potter’s hands shaping a clay bowl on a wheel',
    line: 'Make something imperfect and lovely on a potter’s wheel.',
    description: 'Learn how to center clay, pull the walls of a bowl and shape its rim in a small studio. The session is set up for first-timers, and your piece will be fired after the workshop.',
    includes: ['Wheel and tools', 'Clay and firing', 'Guidance from a studio potter'],
  },
  {
    id: 'wetlands', name: 'A morning in the reeds', category: 'Outdoors',
    location: 'Okhla Bird Sanctuary, Noida', duration: '3 hours', time: '7:00 AM',
    price: 950, capacity: 8, image: assets + 'wetlands.webp',
    alt: 'Reeds and birds over a quiet wetland at first light',
    line: 'An early start for still water, birdsong and a little fresh air.',
    description: 'Follow the wetland trail with a nature guide and stop at viewpoints to look for waterbirds. Bring water and comfortable shoes. The pace suits beginners.',
    includes: ['Nature guide', 'Binoculars to share', 'Sanctuary entry'],
  },
]

export type Booking = { id: string; trip: string; date: string; guests: number }

export const money = (amount: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(amount)

export function weekendDates(now = new Date()) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12)
  const dates: string[] = []
  while (dates.length < 4) {
    if (date.getDay() === 0 || date.getDay() === 6) {
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      dates.push([date.getFullYear(), month, day].join('-'))
    }
    date.setDate(date.getDate() + 1)
  }
  return dates
}

export function dateLabel(date: string) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    .format(new Date(date + 'T12:00:00'))
}
