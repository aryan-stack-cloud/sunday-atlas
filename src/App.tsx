import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronRight, Clock3, Compass,
  Columns2, Heart, MapPin, Minus, Plus, Search, Ticket, Users, X,
} from 'lucide-react'
import { dateLabel, money, seatsLeft, trips, weekendDates, type Booking, type Trip } from './trips'
import { Feature } from './Feature'

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

function Modal({ children, onClose, title, side = false }: {
  children: ReactNode; onClose: () => void; title: string; side?: boolean
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
    <dialog ref={ref} aria-label={title} className={'dialog' + (side ? ' dialog--side' : '')}
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

function CompareDialog({ items, date, bookings, onClose, onOpen }: {
  items: Trip[]; date: string; bookings: Booking[]; onClose: () => void; onOpen: (trip: Trip) => void
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
              <tr><th scope="row">{date ? 'Spots left' : 'Group size'}</th>{items.map(trip => <td key={trip.id}>{date ? seatsLeft(trip, date, bookings) : 'Up to ' + trip.capacity}</td>)}</tr>
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

function BookingDialog({ trip, bookings, initialDate, onBook, onClose, onTrips }: {
  trip: Trip; bookings: Booking[]; initialDate: string; onBook: (booking: Booking) => void; onClose: () => void; onTrips: () => void
}) {
  const [stage, setStage] = useState<'choose' | 'review' | 'done'>('choose')
  const [date, setDate] = useState(() => initialDate && seatsLeft(trip, initialDate, bookings) ? initialDate : '')
  const [guests, setGuests] = useState(1)
  const [reference, setReference] = useState('')
  const dates = weekendDates()
  const headline = useRef<HTMLHeadingElement>(null)
  const available = (day: string) => seatsLeft(trip, day, bookings)
  const seats = date ? available(date) : trip.capacity
  const canBook = dates.includes(date) && guests <= seats
  const total = money(trip.price * guests)

  function go(next: typeof stage) {
    setStage(next)
    requestAnimationFrame(() => headline.current?.focus())
  }

  function confirm() {
    if (!canBook) return
    const id = 'SA-' + crypto.randomUUID().slice(0, 8).toUpperCase()
    onBook({ id, trip: trip.id, date, guests })
    setReference(id)
    go('done')
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
              <button type="button" className="primary" disabled={!canBook} onClick={() => go('review')}>Review booking <ArrowRight size={17} /></button>
            </div>
          </div>
        </>
      ) : stage === 'review' ? (
        <div className="dialog-content review">
          <button className="text-button" type="button" onClick={() => go('choose')}><ArrowLeft size={16} /> Back to trip</button>
          <h2 ref={headline} tabIndex={-1}>Review your booking</h2>
          <div className="review-card">
            <h3>{trip.name}</h3>
            <p><MapPin size={17} /> {trip.location}</p>
            <p><CalendarDays size={17} /> {dateLabel(date)} · {trip.time}</p>
            <p><Users size={17} /> {guests} {guests === 1 ? 'guest' : 'guests'}</p>
            <div className="review-total"><span>{money(trip.price)} × {guests}</span><strong>{total}</strong></div>
          </div>
          <p className="fine-print">This is a demo booking. No payment or personal details are collected.</p>
          <button type="button" className="primary" disabled={!canBook} onClick={confirm}>Confirm demo booking <ArrowRight size={17} /></button>
        </div>
      ) : (
        <div className="dialog-content success">
          <span className="success-icon"><Check size={28} /></span>
          <h2 ref={headline} tabIndex={-1}>You’re on the list.</h2>
          <p>{trip.name} · {dateLabel(date)} · {guests} {guests === 1 ? 'guest' : 'guests'}</p>
          <p className="reference">Demo booking {reference}</p>
          <button type="button" className="primary" onClick={onTrips}>See my trips <ArrowRight size={17} /></button>
        </div>
      )}
    </Modal>
  )
}

function MyTrips({ bookings, onClose, onCancel }: { bookings: Booking[]; onClose: () => void; onCancel: (id: string) => void }) {
  const [cancel, setCancel] = useState('')
  return (
    <Modal title="My trips" side onClose={onClose}>
      <div className="dialog-content tray">
        <h2>My trips</h2>
        {bookings.length ? bookings.map(booking => {
          const trip = trips.find(item => item.id === booking.trip)
          if (!trip) return null
          return (
            <article key={booking.id} className="tray-item">
              <img src={trip.image} alt="" />
              <div>
                <h3>{trip.name}</h3>
                <p>{dateLabel(booking.date)} · {trip.time}</p>
                <p>{booking.guests} {booking.guests === 1 ? 'guest' : 'guests'} · {money(trip.price * booking.guests)}</p>
                {cancel === booking.id ? (
                  <div className="cancel-actions">
                    <button type="button" className="text-button" onClick={() => { onCancel(booking.id); setCancel('') }}>Yes, cancel</button>
                    <button type="button" className="text-button" onClick={() => setCancel('')}>Keep booking</button>
                  </div>
                ) : <button type="button" className="text-button cancel" onClick={() => setCancel(booking.id)}>Cancel booking</button>}
              </div>
            </article>
          )
        }) : <div className="empty"><Ticket size={30} /><h3>No bookings yet</h3><button type="button" className="primary" onClick={onClose}>Explore trips <ArrowRight size={17} /></button></div>}
      </div>
    </Modal>
  )
}

export function App() {
  const [filter, setFilter] = useState<Filter>('All trips')
  const [query, setQuery] = useState('')
  const [savedOnly, setSavedOnly] = useState(false)
  const [day, setDay] = useState('')
  const [compared, setCompared] = useState<string[]>([])
  const [showCompare, setShowCompare] = useState(false)
  const [saved, setSaved] = useState<string[]>(() => readLocal('sunday-atlas:saved', []))
  const [bookings, setBookings] = useState<Booking[]>(() => readLocal('sunday-atlas:bookings', []))
  const [selected, setSelected] = useState<Trip | null>(null)
  const [showTrips, setShowTrips] = useState(false)
  const compareItems = trips.filter(trip => compared.includes(trip.id))
  const search = query.trim().toLowerCase()
  const visible = trips.filter(trip => (
    (!savedOnly || saved.includes(trip.id)) &&
    (filter === 'All trips' || trip.category === filter) &&
    (!day || seatsLeft(trip, day, bookings) > 0) &&
    [trip.name, trip.category, trip.location, trip.line].join(' ').toLowerCase().includes(search)
  ))

  function toggleSaved(id: string) {
    const next = saved.includes(id) ? saved.filter(item => item !== id) : [...saved, id]
    setSaved(next)
    storeLocal('sunday-atlas:saved', next)
  }

  function updateBookings(next: Booking[]) {
    setBookings(next)
    storeLocal('sunday-atlas:bookings', next)
  }

  function reset() {
    setFilter('All trips')
    setSavedOnly(false)
    setQuery('')
    setDay('')
  }

  return (
    <>
      <a className="skip" href="#explore">Skip to trips</a>
      <header className="site-header">
        <div className="shell nav">
          <a className="brand" href="#" onClick={reset}><span className="brand-mark"><Compass size={23} /></span> Sunday Atlas<span className="brand-dot">.</span></a>
          <nav aria-label="Main">
            <a className="nav-explore" href="#explore" onClick={reset}>Explore</a>
            <a href="#explore" className={'nav-saved' + (savedOnly ? ' selected' : '')}
              onClick={() => { reset(); setSavedOnly(true) }}>
              <Heart size={17} /> <span>Saved</span>{saved.length > 0 && <span className="nav-count">{saved.length}</span>}
            </a>
            <button type="button" className="trip-nav" onClick={() => setShowTrips(true)}><Ticket size={17} /> <span>My trips</span>{bookings.length > 0 && <span className="nav-count">{bookings.length}</span>}</button>
          </nav>
        </div>
      </header>
      <main>
        <Feature onExplore={reset} onOpen={setSelected} />
        <section id="explore" className="shell explore" aria-labelledby="explore-title">
          <div className="explore-heading">
            <div>
              <h2 id="explore-title">{savedOnly ? 'Saved trips' : 'Find your kind of outside.'}</h2>
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
            <label className="date-filter"><CalendarDays size={17} aria-hidden="true" />
              <select value={day} aria-label="Filter by date" onChange={event => setDay(event.target.value)}>
                <option value="">Any date</option>
                {weekendDates().map(value => <option value={value} key={value}>{dateLabel(value)}</option>)}
              </select>
            </label>
          </div>
          {visible.length ? (
            <div className={'trip-grid' + (visible.length === 3 ? ' gallery' : '')}>
              {visible.map(trip => <TripCard key={trip.id} trip={trip} saved={saved.includes(trip.id)}
                compared={compared.includes(trip.id)}
                onSave={() => toggleSaved(trip.id)} onOpen={() => setSelected(trip)}
                onCompare={() => setCompared(current => current.includes(trip.id) ? current.filter(id => id !== trip.id) : [...current, trip.id])} />)}
            </div>
          ) : <div className="empty">
            {savedOnly ? <Heart size={31} /> : <Search size={31} />}
            <h3>{savedOnly && !search ? 'No saved trips yet' : 'No matching trips'}</h3>
            <button className="text-button" type="button" onClick={reset}>Show all trips <ChevronRight size={17} /></button>
          </div>}
        </section>
      </main>
      <footer className="shell site-footer"><span>Sunday Atlas</span><span>Booking experience prototype</span></footer>
      {compared.length > 0 && <aside className="compare-tray" aria-label="Selected for comparison">
        <div className="compare-count"><Columns2 size={21} /><span><strong>{compared.length} selected</strong><small>{compared.length === 1 ? 'Choose another trip to compare' : 'Compare your shortlist'}</small></span></div>
        <div className="compare-actions">
          <button type="button" className="text-button" onClick={() => setCompared([])}>Clear</button>
          <button type="button" className="primary" disabled={compared.length < 2} onClick={() => setShowCompare(true)}>Compare trips <ArrowRight size={16} /></button>
        </div>
      </aside>}
      {showCompare && <CompareDialog items={compareItems} date={day} bookings={bookings}
        onClose={() => setShowCompare(false)} onOpen={trip => { setShowCompare(false); setSelected(trip) }} />}
      {selected && <BookingDialog trip={selected} bookings={bookings} initialDate={day}
        onBook={booking => updateBookings([...bookings, booking])}
        onClose={() => setSelected(null)} onTrips={() => { setSelected(null); setShowTrips(true) }} />}
      {showTrips && <MyTrips bookings={bookings} onClose={() => setShowTrips(false)}
        onCancel={id => updateBookings(bookings.filter(booking => booking.id !== id))} />}
    </>
  )
}
