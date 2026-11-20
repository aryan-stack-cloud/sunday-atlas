import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ArrowDown, ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, Clock3, Compass,
  Heart, MapPin, Minus, Plus, Search, Ticket, Users, X,
} from 'lucide-react'
import { dateLabel, money, trips, weekendDates, type Booking, type Category, type Trip } from './trips'

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

function TripCard({ trip, saved, onSave, onOpen }: {
  trip: Trip; saved: boolean; onSave: () => void; onOpen: () => void
}) {
  return (
    <article className="trip-card">
      <div className="card-media">
        <img src={trip.image} alt={trip.alt} width="560" height="370" />
        <span className="category-label">{trip.category}</span>
        <button className={'icon-button save' + (saved ? ' is-saved' : '')} type="button"
          aria-label={saved ? 'Remove ' + trip.name + ' from saved trips' : 'Save ' + trip.name}
          aria-pressed={saved} onClick={onSave}><Heart size={19} /></button>
      </div>
      <div className="card-content">
        <p className="eyeline"><MapPin size={14} /> {trip.location}</p>
        <h3>{trip.name}</h3>
        <p className="card-description">{trip.line}</p>
        <div className="card-bottom">
          <div className="price"><strong>{money(trip.price)}</strong> <span>/ person</span></div>
          <button className="card-link" onClick={onOpen} type="button">View trip <ArrowRight size={16} /></button>
        </div>
      </div>
    </article>
  )
}

function BookingDialog({ trip, bookings, onBook, onClose, onTrips }: {
  trip: Trip; bookings: Booking[]; onBook: (booking: Booking) => void; onClose: () => void; onTrips: () => void
}) {
  const [stage, setStage] = useState<'choose' | 'review' | 'done'>('choose')
  const [date, setDate] = useState('')
  const [guests, setGuests] = useState(1)
  const [reference, setReference] = useState('')
  const dates = weekendDates()
  const headline = useRef<HTMLHeadingElement>(null)
  function available(day: string) {
    const booked = bookings.filter(booking => booking.trip === trip.id && booking.date === day)
      .reduce((total, booking) => total + booking.guests, 0)
    return Math.max(0, trip.capacity - booked)
  }
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
  const [saved, setSaved] = useState<string[]>(() => readLocal('sunday-atlas:saved', []))
  const [bookings, setBookings] = useState<Booking[]>(() => readLocal('sunday-atlas:bookings', []))
  const [selected, setSelected] = useState<Trip | null>(null)
  const [showTrips, setShowTrips] = useState(false)
  const search = query.trim().toLowerCase()
  const visible = trips.filter(trip => (
    (!savedOnly || saved.includes(trip.id)) &&
    (filter === 'All trips' || trip.category === filter as Category) &&
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
              onClick={() => { setSavedOnly(true); setFilter('All trips'); setQuery('') }}>
              <Heart size={17} /> <span>Saved</span>{saved.length > 0 && <span className="nav-count">{saved.length}</span>}
            </a>
            <button type="button" className="trip-nav" onClick={() => setShowTrips(true)}><Ticket size={17} /> <span>My trips</span>{bookings.length > 0 && <span className="nav-count">{bookings.length}</span>}</button>
          </nav>
        </div>
      </header>
      <main className="shell">
        <section className="hero" aria-labelledby="hero-title">
          <img className="hero-image" src={import.meta.env.BASE_URL + 'images/hero.webp'} fetchPriority="high"
            alt="Sunlight over an old sandstone arch and gardens in Delhi" />
          <div className="hero-copy">
            <p className="hero-kicker"><MapPin size={15} /> Day trips from Delhi</p>
            <h1 id="hero-title">Good days are <em>closer.</em></h1>
            <p>Small-group walks, workshops and outdoor escapes for your next free weekend.</p>
            <a href="#explore" className="hero-cta" onClick={reset}>Find a day trip <ArrowDown size={17} /></a>
          </div>
        </section>
        <section id="explore" className="explore" aria-labelledby="explore-title">
          <div className="explore-heading">
            <div><h2 id="explore-title">{savedOnly ? 'Saved trips' : 'Find your next escape'}</h2>
              <p aria-live="polite">{visible.length} {visible.length === 1 ? 'trip' : 'trips'}{savedOnly ? ' saved' : ' to explore'}</p></div>
            <div className="search">
              <Search size={18} aria-hidden="true" />
              <input type="search" name="trip-search" aria-label="Search trips" placeholder="Search trips or places"
                value={query} onChange={event => setQuery(event.target.value)} />
            </div>
          </div>
          {!savedOnly && <div className="filters" aria-label="Filter by trip type">
            {categories.map(category => <button type="button" key={category} aria-pressed={filter === category}
              onClick={() => setFilter(category)}>{category}</button>)}
          </div>}
          {visible.length ? (
            <div className="trip-grid">
              {visible.map(trip => <TripCard key={trip.id} trip={trip} saved={saved.includes(trip.id)}
                onSave={() => toggleSaved(trip.id)} onOpen={() => setSelected(trip)} />)}
            </div>
          ) : <div className="empty">
            {savedOnly ? <Heart size={31} /> : <Search size={31} />}
            <h3>{savedOnly && !search ? 'No saved trips yet' : 'No matching trips'}</h3>
            <button className="text-button" type="button" onClick={reset}>Show all trips <ChevronRight size={17} /></button>
          </div>}
        </section>
      </main>
      <footer className="shell site-footer"><span>Sunday Atlas</span><span>Booking experience prototype</span></footer>
      {selected && <BookingDialog trip={selected} bookings={bookings}
        onBook={booking => updateBookings([...bookings, booking])}
        onClose={() => setSelected(null)} onTrips={() => { setSelected(null); setShowTrips(true) }} />}
      {showTrips && <MyTrips bookings={bookings} onClose={() => setShowTrips(false)}
        onCancel={id => updateBookings(bookings.filter(booking => booking.id !== id))} />}
    </>
  )
}
