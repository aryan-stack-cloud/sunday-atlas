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

import catalog from './catalog.json'

const assets = import.meta.env.BASE_URL + 'images/'

export const trips: Trip[] = catalog.map(trip => ({ ...trip, category: trip.category as Category, image: assets + trip.image }))

export type Booking = {
  id: string; trip: string; date: string; guests: number; total: number
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled'
}

export type Departure = { trip: string; date: string; capacity: number; remaining: number; active: boolean }

export const money = (amount: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(amount)

const label = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short',
})

export function dateLabel(date: string) {
  return label.format(new Date(date + 'T12:00:00Z'))
}

export function seatsLeft(trip: Trip, date: string, departures: Departure[]) {
  const departure = departures.find(item => item.trip === trip.id && item.date === date && item.active)
  return departure?.remaining ?? 0
}
