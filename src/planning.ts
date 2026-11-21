import { useEffect, useState } from 'react'
import { guides, tripById } from './guide'
import type { Trip } from './trips'

type DayPlan = { ids: string[]; date: string; start: string; notes: string }
const key = 'sunday-atlas:day-plan:v1'
const empty: DayPlan = { ids: [], date: '', start: '08:00', notes: '' }

function readPlan(): DayPlan {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || 'null')
    if (!raw || !Array.isArray(raw.ids)) return empty
    return {
      ids: [...new Set<string>(raw.ids.filter((id: unknown) => typeof id === 'string' && tripById(id)))],
      date: /^\d{4}-\d{2}-\d{2}$/.test(raw.date) && Number.isFinite(Date.parse(raw.date)) ? raw.date : '',
      start: /^([01]\d|2[0-3]):[0-5]\d$/.test(raw.start) ? raw.start : empty.start,
      notes: typeof raw.notes === 'string' ? raw.notes.slice(0, 2000) : '',
    }
  } catch { return empty }
}

export function useDayPlan() {
  const [plan, setPlan] = useState(readPlan)
  const [persistent, setPersistent] = useState(true)
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(plan)); setPersistent(true) }
    catch { setPersistent(false) }
  }, [plan])
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === key) setPlan(readPlan()) }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  function add(id: string) {
    setPlan(current => current.ids.includes(id) ? current : { ...current, ids: [...current.ids, id] })
  }
  function remove(id: string) {
    setPlan(current => ({ ...current, ids: current.ids.filter(item => item !== id) }))
  }
  function move(id: string, direction: number) {
    setPlan(current => {
      const index = current.ids.indexOf(id)
      const target = index + direction
      if (index < 0 || target < 0 || target >= current.ids.length) return current
      const ids = [...current.ids]
      ids.splice(target, 0, ...ids.splice(index, 1))
      return { ...current, ids }
    })
  }
  function edit(field: 'date' | 'start' | 'notes', value: string) {
    setPlan(current => ({ ...current, [field]: value }))
  }
  return { plan, persistent, add, remove, move, edit }
}
export type Planner = ReturnType<typeof useDayPlan>
export const transferMinutes = 45

export function schedule(plan: DayPlan) {
  const [hours, minutes] = (plan.start || empty.start).split(':').map(Number)
  let cursor = hours * 60 + minutes
  return plan.ids.flatMap(id => {
    const trip = tripById(id)
    if (!trip) return []
    const start = cursor
    const end = start + guides[id].minutes
    cursor = end + transferMinutes
    return [{ trip, start, end }]
  })
}

export function clockTime(minutes: number) {
  const hour = Math.floor(minutes / 60) % 24
  const day = Math.floor(minutes / 1440)
  return (hour % 12 || 12) + ':' + String(minutes % 60).padStart(2, '0') + (hour < 12 ? ' am' : ' pm') + (day ? ' (+' + day + 'd)' : '')
}

function calendarText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/[,;]/g, match => '\\' + match)
}

function calendarLine(line: string) {
  const encoder = new TextEncoder()
  let result = '', length = 0
  for (const char of line) {
    const bytes = encoder.encode(char).length
    if (length + bytes > 75) { result += '\r\n '; length = 1 }
    result += char
    length += bytes
  }
  return result
}

export function downloadPlan(plan: DayPlan) {
  if (!plan.date || !plan.start || !plan.ids.length) return
  const stamp = (time: number) => new Date(time).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const midnight = Date.parse(plan.date + 'T00:00:00+05:30')
  const event = ({ trip, start, end }: { trip: Trip; start: number; end: number }) => [
    'BEGIN:VEVENT', 'UID:' + trip.id + '-' + plan.date + '@sunday-atlas', 'DTSTAMP:' + stamp(Date.now()),
    'DTSTART:' + stamp(midnight + start * 60000), 'DTEND:' + stamp(midnight + end * 60000),
    'SUMMARY:' + calendarText(trip.name), 'LOCATION:' + calendarText(trip.location),
    'DESCRIPTION:' + calendarText([trip.itinerary.join('\n'), plan.notes, 'Personal itinerary.'].filter(Boolean).join('\n\n')), 'END:VEVENT',
  ]
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sunday Atlas//Day plan//EN', ...schedule(plan).flatMap(event), 'END:VCALENDAR']
  const url = URL.createObjectURL(new Blob([lines.map(calendarLine).join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'sunday-atlas-' + plan.date + '.ics'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
