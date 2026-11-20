import type { Booking, Departure } from './trips'

export type AtlasState = { sample: boolean; operator: boolean; departures: Departure[]; bookings: Booking[] }
export type BookingInput = { trip: string; date: string; guests: number; requestKey: string; name: string; email: string }
export type OperatorState = { departures: Departure[]; bookings: Array<Booking & { name: string; email: string }> }

const base = import.meta.env.BASE_URL
export async function api<T>(path: string, init: RequestInit = {}, key?: string): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  if (key) headers.set('Authorization', 'Bearer ' + key)
  const response = await fetch(base + 'api/' + path, { ...init, headers, credentials: 'same-origin' })
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Booking requests are available on the full Sunday Atlas server.')
  }
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'The booking service is unavailable.')
  return data as T
}
