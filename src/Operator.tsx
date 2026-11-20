import { useState, type FormEvent } from 'react'
import { api, type OperatorState } from './api'
import { dateLabel, trips } from './trips'

export function Operator() {
  const [key, setKey] = useState('')
  const [data, setData] = useState<OperatorState | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [slot, setSlot] = useState({ trip: trips[0].id, date: '', capacity: trips[0].capacity, active: true })
  async function update(action: () => Promise<unknown>) {
    setBusy(true)
    setMessage('')
    try {
      await action()
      setData(await api<OperatorState>('operator', {}, key))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Try again.')
    } finally {
      setBusy(false)
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    void update(() => api('operator/departures', { method: 'POST', body: JSON.stringify(slot) }, key))
  }
  return (
    <main id="main-content" className="shell utility-page">
      <h1>Operator desk</h1>
      <form className="operator-sign-in" onSubmit={event => { event.preventDefault(); void update(async () => {}) }}>
        <label>Operator access key <input type="password" value={key} required onChange={event => { setKey(event.target.value); setData(null) }} /></label>
        <button className="primary" type="submit" disabled={busy}>Load dashboard</button>
      </form>
      {message && <p role="alert">{message}</p>}
      {data && <>
        <section className="operator-section">
          <h2>Departures</h2>
          <form className="departure-form" onSubmit={submit}>
            <label>Experience<select value={slot.trip} onChange={event => {
              const trip = trips.find(item => item.id === event.target.value)!
              setSlot({ ...slot, trip: trip.id, capacity: trip.capacity })
            }}>{trips.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Date<input type="date" value={slot.date} required onChange={event => setSlot({ ...slot, date: event.target.value })} /></label>
            <label>Capacity<input type="number" min="1" max={trips.find(item => item.id === slot.trip)?.capacity} value={slot.capacity} required
              onChange={event => setSlot({ ...slot, capacity: Number(event.target.value) })} /></label>
            <label className="departure-checkbox"><input type="checkbox" checked={slot.active} onChange={event => setSlot({ ...slot, active: event.target.checked })} /> Open for requests</label>
            <button className="primary" type="submit" disabled={busy}>Save departure</button>
          </form>
          <ul className="operator-records">
            {data.departures.map(item => <li key={item.trip + item.date}>
              <span>{trips.find(trip => trip.id === item.trip)?.name} · {dateLabel(item.date)} · {item.remaining} / {item.capacity} available · {item.active ? 'Open' : 'Closed'}</span>
              <button className="text-button" type="button" onClick={() => setSlot({ ...item, active: Boolean(item.active) })}>Edit departure</button>
            </li>)}
          </ul>
        </section>
        <section className="operator-section">
          <h2>Booking requests</h2>
          {data.bookings.length === 0 && <p>No requests yet.</p>}
          <ul className="operator-records">{data.bookings.map(item => <li key={item.id}>
            <div><strong>{trips.find(trip => trip.id === item.trip)?.name} · {item.status}</strong><br />
              <span>{dateLabel(item.date)} · {item.guests} guests · {item.id}</span>
              {item.email && <p>{item.name} · {item.email}</p>}
            </div>
            {item.status === 'pending' && <div className="operator-actions">
              {(['confirmed', 'declined'] as const).map(status => <button className="secondary" type="button" key={status} disabled={busy}
                onClick={() => void update(() => api('operator/bookings/' + item.id, { method: 'PATCH', body: JSON.stringify({ status }) }, key))}>
                {status === 'confirmed' ? 'Confirm' : 'Decline'}
              </button>)}
            </div>}
          </li>)}</ul>
        </section>
      </>}
    </main>
  )
}
