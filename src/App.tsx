import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronRight, Clock3, Compass,
  Columns2, Heart, MapPin, Minus, Plus, Search, Ticket, Users, X,
} from 'lucide-react'
import { dateLabel, money, seatsLeft, trips, type Booking, type Departure, type Trip } from './trips'
import { Feature } from './Feature'
import { Destination } from './Destination'
import { Operator } from './Operator'
import { api, type AtlasState, type BookingInput } from './api'

const categories = ['All trips', 'Heritage', 'Workshops', 'Outdoors'] as const
type Filter = (typeof categories)[number]

function readLocal<T,>(key: string, fallback: T): T {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
    return Array.isArray(value) ? value as T : fallback
  } catch {
    return fallback
  }
}

function storeLocal<T,>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Browsers that block local storage can still use the current session.
  }
}

function Modal({ children, onClose, title }: {
  children: ReactNode; onClose: () => void; title: string
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current!
    const focused = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      if (focused?.isConnected) focused.focus()
    }
  }, [])

  return (
    <dialog ref={ref} aria-label={title} className="dialog"
      onCancel={event => { event.preventDefault(); onClose() }}
      onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="dialog-inner">
        <button type="button" className="icon-button modal-close" aria-label="Close" onClick={onClose}><X size={20} /></button>
        {children}
      </div>
    </dialog>
  )
}

function TripCard({ trip, saved, compared, onSave, onCompare, onOpen }: {
  trip: Trip; saved: boolean; compared: boolean
  onSave: () => void; onCompare: () => void; onOpen: () => void
}) {
  return (
    <article className={'trip-card trip-card--' + trip.id}>
      <div className="card-media">
        <img src={trip.image} alt={trip.alt} width="560" height="370" />
      </div>
      <div className="card-top">
        <span className="category-label">{trip.category}</span>
        <button className={'icon-button save' + (saved ? ' is-saved' : '')} type="button"
          aria-label={saved ? 'Remove ' + trip.name + ' from saved trips' : 'Save ' + trip.name}
          aria-pressed={saved} onClick={onSave}><Heart size={19} /></button>
      </div>
      <div className="card-content">
        <p className="eyeline"><MapPin size={14} /> {trip.location} <span aria-hidden="true">·</span> {trip.duration}</p>
        <h3>{trip.name}</h3>
        <p className="card-description">{trip.line}</p>
        <div className="card-bottom">
          <div className="price"><strong>{money(trip.price)}</strong> <span>/ person</span></div>
          <button className="card-link" onClick={onOpen} type="button">View trip <ArrowUpRight size={16} /></button>
        </div>
        <button className="compare-toggle" type="button" aria-pressed={compared}
          aria-label={compared ? 'Remove ' + trip.name + ' from comparison' : 'Compare ' + trip.name}
          onClick={onCompare}>{compared ? <Check size={15} /> : <Columns2 size={15} />} {compared ? 'Added to compare' : 'Compare'}</button>
      </div>
    </article>
  )
}

function CompareDialog({ items, date, departures, onClose, onOpen }: {
  items: Trip[]; date: string; departures: Departure[]; onClose: () => void; onOpen: (trip: Trip) => void
}) {
  return (
    <Modal title="Compare trips" onClose={onClose}>
      <div className="dialog-content compare-content">
        <h2>Compare trips</h2>
        <p>{date ? 'Availability for ' + dateLabel(date) : 'Price, duration, and group size at a glance.'}</p>
        <div className="compare-scroll" role="region" aria-label="Trip comparison" tabIndex={0}>
          <table className="compare-table">
            <thead><tr><th scope="col">Trip</th>{items.map(trip => <th scope="col" key={trip.id}>
              <img src={trip.image} alt="" width="180" height="98" />{trip.name}
            </th>)}</tr></thead>
            <tbody>
              <tr><th scope="row">Per person</th>{items.map(trip => <td key={trip.id}>{money(trip.price)}</td>)}</tr>
              <tr><th scope="row">Duration</th>{items.map(trip => <td key={trip.id}>{trip.duration}</td>)}</tr>
              <tr><th scope="row">Starts at</th>{items.map(trip => <td key={trip.id}>{trip.time}</td>)}</tr>
              <tr><th scope="row">{date ? 'Spots left' : 'Group size'}</th>{items.map(trip => <td key={trip.id}>{date ? seatsLeft(trip, date, departures) : 'Up to ' + trip.capacity}</td>)}</tr>
              <tr><th scope="row">Location</th>{items.map(trip => <td key={trip.id}>{trip.location}</td>)}</tr>
              <tr><td />{items.map(trip => <td key={trip.id}><button className="text-button" type="button"
                aria-label={'View ' + trip.name} onClick={() => onOpen(trip)}>View trip <ArrowUpRight size={15} /></button></td>)}</tr>
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  )
}

function BookingDialog({ trip, departures, initialDate, sample, onBook, onClose, onTrips }: {
  trip: Trip; departures: Departure[]; initialDate: string; sample: boolean
  onBook: (input: BookingInput) => Promise<Booking>; onClose: () => void; onTrips: () => void
}) {
  const [stage, setStage] = useState<'choose' | 'review' | 'done'>('choose')
  const [date, setDate] = useState(() => initialDate && seatsLeft(trip, initialDate, departures) ? initialDate : '')
  const [guests, setGuests] = useState(1)
  const [reference, setReference] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [requestKey, setRequestKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const dates = departures.filter(item => item.trip === trip.id && item.active).map(item => item.date)
  const headline = useRef<HTMLHeadingElement>(null)
  const available = (day: string) => seatsLeft(trip, day, departures)
  const seats = date ? available(date) : trip.capacity
  const canBook = dates.includes(date) && guests <= seats
  const total = money(trip.price * guests)

  function go(next: typeof stage) {
    setStage(next)
    setMessage('')
    requestAnimationFrame(() => headline.current?.focus())
  }

  async function confirm(event: FormEvent) {
    event.preventDefault()
    if (!canBook || busy) return
    setBusy(true)
    setMessage('')
    try {
      const booking = await onBook({ trip: trip.id, date, guests, requestKey, name, email })
      setReference(booking.id)
      go('done')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save the request. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} title={trip.name}>
      {stage === 'choose' ? (
        <>
          <img className="detail-image" width="640" height="210" src={trip.image} alt={trip.alt} />
          <div className="dialog-content">
            <p className="eyeline">{trip.category} <span aria-hidden="true">·</span> {trip.location}</p>
            <h2 ref={headline} tabIndex={-1}>{trip.name}</h2>
            <div className="detail-meta"><span><Clock3 size={16} /> {trip.duration}</span><span><Users size={16} /> Up to {trip.capacity} guests</span></div>
            <p>{trip.description}</p>
            <details className="includes">
              <summary>What’s included</summary>
              <ul>{trip.includes.map(item => <li key={item}><Check size={14} /> {item}</li>)}</ul>
            </details>
            <details className="includes itinerary">
              <summary>Itinerary and meeting point</summary>
              <p>{trip.meeting}</p>
              <ol>{trip.itinerary.map(item => <li key={item}>{item}</li>)}</ol>
            </details>
            <fieldset className="date-field">
              <legend>Choose a date</legend>
              <div className="date-grid">
                {dates.map(day => (
                  <label className="date-option" key={day}>
                    <input name="trip-date" type="radio" disabled={available(day) === 0}
                      checked={date === day} onChange={() => { setDate(day); setGuests(Math.min(guests, available(day))) }} />
                    <span><strong>{dateLabel(day)}</strong><small>{available(day) ? trip.time : 'Sold out'}</small></span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="guest-field">
              <div><strong>Guests</strong><small>{date ? seats + (seats === 1 ? ' spot available' : ' spots available') : 'Choose a date to check spots'}</small></div>
              <div className="stepper">
                <button type="button" aria-label="Remove a guest" disabled={guests <= 1} onClick={() => setGuests(guests - 1)}><Minus size={16} /></button>
                <output aria-label="Guest count" aria-live="polite">{guests}</output>
                <button type="button" aria-label="Add a guest" disabled={guests >= seats} onClick={() => setGuests(guests + 1)}><Plus size={16} /></button>
              </div>
            </div>
            <div className="booking-footer">
              <div className="price"><strong>{total}</strong><small>Total for {guests} {guests === 1 ? 'guest' : 'guests'}</small></div>
              <button type="button" className="primary" disabled={!canBook} onClick={() => { setRequestKey(crypto.randomUUID()); go('review') }}>Review booking <ArrowRight size={17} /></button>
            </div>
          </div>
        </>
      ) : stage === 'review' ? (
        <form className="dialog-content review" onSubmit={confirm}>
          <button className="text-button" type="button" onClick={() => go('choose')}><ArrowLeft size={16} /> Back to trip</button>
          <h2 ref={headline} tabIndex={-1}>Review your booking</h2>
          <div className="review-card">
            <h3>{trip.name}</h3>
            <p><MapPin size={17} /> {trip.location}</p>
            <p><CalendarDays size={17} /> {dateLabel(date)} · {trip.time}</p>
            <p><Users size={17} /> {guests} {guests === 1 ? 'guest' : 'guests'}</p>
            <div className="review-total"><span>{money(trip.price)} × {guests}</span><strong>{total}</strong></div>
          </div>
          {!sample && <div className="contact-fields">
            <label>Full name <input value={name} onChange={event => setName(event.target.value)} name="name" autoComplete="name" required minLength={2} maxLength={80} /></label>
            <label>Email address <input value={email} onChange={event => setEmail(event.target.value)} type="email" name="email" autoComplete="email" required maxLength={200} /></label>
          </div>}
          <p className="fine-print">{sample ? 'This site is using sample departures for testing.' : 'The operator uses your email to contact you about this request. Payment is arranged separately.'}</p>
          {message && <p className="form-error" role="alert">{message}</p>}
          <button type="submit" className="primary" disabled={!canBook || busy}>{busy ? 'Sending request…' : 'Request reservation'} <ArrowRight size={17} /></button>
        </form>
      ) : (
        <div className="dialog-content success">
          <span className="success-icon"><Check size={28} /></span>
          <h2 ref={headline} tabIndex={-1}>Request received.</h2>
          <p>{trip.name} · {dateLabel(date)} · {guests} {guests === 1 ? 'guest' : 'guests'}</p>
          <p className="reference">Booking reference {reference}</p><p>Check My trips for confirmation from the operator.</p>
          <button type="button" className="primary" onClick={onTrips}>See my trips <ArrowRight size={17} /></button>
        </div>
      )}
    </Modal>
  )
}

function MyTrips({ bookings, onCancel, refresh }: {
  bookings: Booking[]; onCancel: (id: string) => Promise<void>; refresh: () => void
}) {
  const [cancel, setCancel] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  async function confirmCancellation(id: string) {
    setPending(true)
    setMessage('')
    try { await onCancel(id); setCancel('') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Cancellation failed.') }
    finally { setPending(false) }
  }
  return (
    <main id="main-content" className="shell utility-page">
      <div className="utility-heading"><h1>My trips</h1><button className="secondary" type="button" onClick={refresh}>Refresh status</button></div>
      {message && <p role="alert">{message}</p>}
      {bookings.length ? bookings.map(booking => {
        const trip = trips.find(item => item.id === booking.trip)
        if (!trip) return null
        return (
          <article key={booking.id} className="tray-item">
            <img src={trip.image} alt="" />
            <div>
              <h3>{trip.name}</h3>
              <p>{dateLabel(booking.date)} · {trip.time}</p>
              <p>{booking.guests} {booking.guests === 1 ? 'guest' : 'guests'} · {money(booking.total)}</p>
              <p>{booking.id}</p>
              {(booking.status === 'pending' || booking.status === 'confirmed') && (cancel === booking.id ? (
                <div className="cancel-actions">
                  <button type="button" disabled={pending} className="text-button" onClick={() => void confirmCancellation(booking.id)}>Yes, cancel</button>
                  <button type="button" disabled={pending} className="text-button" onClick={() => setCancel('')}>Keep booking</button>
                </div>
              ) : <button type="button" className="text-button cancel" onClick={() => setCancel(booking.id)}>Cancel booking</button>)}
            </div>
            <span className={'booking-status status-' + booking.status}>{booking.status}</span>
          </article>
        )
      }) : <div className="empty"><Ticket size={30} /><h3>No bookings yet</h3><a className="primary" href="#/experiences">Explore trips <ArrowRight size={17} /></a></div>}
    </main>
  )
}

function readRoute() {
  return window.location.hash.startsWith('#/') ? window.location.hash.slice(1) : '/'
}

export function App() {
  const [filter, setFilter] = useState<Filter>('All trips')
  const [query, setQuery] = useState('')
  const [route, setRoute] = useState(readRoute)
  const [atlas, setAtlas] = useState<AtlasState | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const savedOnly = route === '/saved'
  const [day, setDay] = useState('')
  const [compared, setCompared] = useState<string[]>([])
  const [showCompare, setShowCompare] = useState(false)
  const [saved, setSaved] = useState<string[]>(() => readLocal('sunday-atlas:saved', []))
  const departures = atlas?.departures ?? []
  const bookings = atlas?.bookings ?? []
  const detail = route.startsWith('/experiences/') ? trips.find(trip => trip.id === route.slice('/experiences/'.length)) : undefined
  const dates = [...new Set(departures.map(item => item.date))]
  const home = route === '/'
  const catalog = home || route === '/experiences' || savedOnly
  const [selected, setSelected] = useState<Trip | null>(null)
  const compareItems = trips.filter(trip => compared.includes(trip.id))
  const search = query.trim().toLowerCase()
  const visible = trips.filter(trip => (
    (!savedOnly || saved.includes(trip.id)) &&
    (filter === 'All trips' || trip.category === filter) &&
    (!day || seatsLeft(trip, day, departures) > 0) &&
    [trip.name, trip.category, trip.location, trip.line].join(' ').toLowerCase().includes(search)
  ))

  function toggleSaved(id: string) {
    const next = saved.includes(id) ? saved.filter(item => item !== id) : [...saved, id]
    setSaved(next)
    storeLocal('sunday-atlas:saved', next)
  }

  async function refresh() {
    try {
      setAtlas(await api<AtlasState>('state'))
      setUnavailable(false)
    } catch {
      setUnavailable(true)
    }
  }

  useEffect(() => {
    void refresh()
    const onRoute = () => {
      const next = readRoute()
      if (next === '/saved') reset()
      setSelected(null)
      setShowCompare(false)
      setRoute(next)
      window.scrollTo({ top: 0, behavior: 'instant' })
      if (next === '/bookings') void refresh()
    }
    window.addEventListener('hashchange', onRoute)
    return () => window.removeEventListener('hashchange', onRoute)
  }, [])

  function open(trip: Trip) {
    window.location.hash = '/experiences/' + trip.id
  }

  async function book(input: BookingInput) {
    try {
      const booking = await api<Booking>('bookings', { method: 'POST', body: JSON.stringify(input) })
      await refresh()
      return booking
    } catch (error) {
      await refresh()
      throw error
    }
  }

  async function cancelBooking(id: string) {
    const updated = await api<Booking>('bookings/' + id, { method: 'DELETE' })
    setAtlas(previous => previous && ({ ...previous, bookings: previous.bookings.map(item => item.id === id ? updated : item) }))
    void refresh()
  }

  function reset() {
    setFilter('All trips')
    setQuery('')
    setDay('')
  }

  return (
    <>
      <a className="skip" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.scrollIntoView() }}>Skip to content</a>
      <header className={'site-header' + (home ? ' site-header--story' : '')}>
        <div className="shell nav">
          <a className="brand" href="#/" onClick={reset}><span className="brand-mark"><Compass size={23} /></span> Sunday Atlas<span className="brand-dot">.</span></a>
          <nav aria-label="Main">
            <a className="nav-explore" href="#/experiences" onClick={reset}>Explore</a>
            <a href="#/saved" className="nav-saved" aria-current={savedOnly ? 'page' : undefined}>
              <Heart size={17} /> <span>Saved</span>{saved.length > 0 && <span className="nav-count">{saved.length}</span>}
            </a>
            <a className="trip-nav" href="#/bookings" aria-current={route === '/bookings' ? 'page' : undefined}><Ticket size={17} /> <span>My trips</span></a>
          </nav>
        </div>
      </header>
      {catalog && <main id="main-content">
        {home && <Feature onExplore={reset} onOpen={open} />}
        <section id="explore" className={'shell explore' + (home ? '' : ' standalone-catalog')} aria-labelledby="explore-title">
          <div className="explore-heading">
            <div>
              <h2 id="explore-title">{savedOnly ? 'Saved experiences' : 'Explore Delhi NCR'}</h2>
              <p aria-live="polite">{visible.length} {visible.length === 1 ? 'experience' : 'experiences'}{savedOnly ? ' saved' : ' around Delhi NCR'}</p>
            </div>
            <div className="search">
              <Search size={18} aria-hidden="true" />
              <input type="search" name="trip-search" aria-label="Search trips" placeholder="Search trips or places"
                value={query} onChange={event => setQuery(event.target.value)} />
            </div>
          </div>
          <div className="filter-bar">
            {!savedOnly && <div className="filters" aria-label="Filter by trip type">
              {categories.map(category => <button type="button" key={category} aria-pressed={filter === category}
                onClick={() => setFilter(category)}>{category}</button>)}
            </div>}
            {dates.length > 0 && <label className="date-filter"><CalendarDays size={17} aria-hidden="true" />
              <select value={day} aria-label="Filter by date" onChange={event => setDay(event.target.value)}>
                <option value="">Any date</option>
                {dates.map(value => <option value={value} key={value}>{dateLabel(value)}</option>)}
              </select>
            </label>}
          </div>
          {visible.length ? (
            <div className={'trip-grid' + (visible.length === 3 ? ' gallery' : '')}>
              {visible.map(trip => <TripCard key={trip.id} trip={trip} saved={saved.includes(trip.id)}
                compared={compared.includes(trip.id)}
                onSave={() => toggleSaved(trip.id)} onOpen={() => open(trip)}
                onCompare={() => setCompared(current => current.includes(trip.id) ? current.filter(id => id !== trip.id) : [...current, trip.id])} />)}
            </div>
          ) : <div className="empty">
            {savedOnly ? <Heart size={31} /> : <Search size={31} />}
            <h3>{savedOnly && !search ? 'No saved trips yet' : 'No matching trips'}</h3>
            <button className="text-button" type="button" onClick={reset}>Show all trips <ChevronRight size={17} /></button>
          </div>}
        </section>
      </main>}
      {detail && <Destination key={detail.id} trip={detail} saved={saved.includes(detail.id)}
        slots={departures.filter(item => item.trip === detail.id && item.remaining > 0)}
        onSave={() => toggleSaved(detail.id)} onBook={() => setSelected(detail)} />}
      {route === '/bookings' && <MyTrips bookings={bookings} onCancel={cancelBooking} refresh={() => void refresh()} />}
      {route === '/operator' && <Operator />}
      {!catalog && !detail && !['/bookings', '/operator'].includes(route) &&
        <main id="main-content" className="shell utility-page"><h1>Experience not found</h1><a href="#/experiences">Explore all experiences</a></main>}
      <footer className="shell site-footer"><span>Sunday Atlas</span>
        <a href="#/experiences">Explore</a>
        {atlas?.operator && <a href="#/operator">Operator desk</a>}
        {atlas?.sample && <span>Sample departures</span>}
        {unavailable && <span>Catalog only · departures to be announced</span>}
      </footer>
      {compared.length > 0 && <aside className="compare-tray" aria-label="Selected for comparison">
        <div className="compare-count"><Columns2 size={21} /><span><strong>{compared.length} selected</strong><small>{compared.length === 1 ? 'Choose another trip to compare' : 'Compare your shortlist'}</small></span></div>
        <div className="compare-actions">
          <button type="button" className="text-button" onClick={() => setCompared([])}>Clear</button>
          <button type="button" className="primary" disabled={compared.length < 2} onClick={() => setShowCompare(true)}>Compare trips <ArrowRight size={16} /></button>
        </div>
      </aside>}
      {showCompare && <CompareDialog items={compareItems} date={day} departures={departures}
        onClose={() => setShowCompare(false)} onOpen={trip => { setShowCompare(false); open(trip) }} />}
      {selected && atlas && <BookingDialog trip={selected} departures={departures} initialDate={day} sample={atlas.sample}
        onBook={book}
        onClose={() => setSelected(null)} onTrips={() => { setSelected(null); window.location.hash = '/bookings' }} />}
    </>
  )
}
