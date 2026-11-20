import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, Clock3, Heart, MapPin, Ticket, Users } from 'lucide-react'
import { dateLabel, money, trips, type Departure, type Trip } from './trips'

const place: Record<string, string> = { lodhi: 'Lodhi', pottery: 'Shahpur Jat', wetlands: 'Okhla' }

export function Destination({ trip, saved, slots, onSave, onBook }: {
  trip: Trip; saved: boolean; slots: Departure[]; onSave: () => void; onBook: () => void
}) {
  return (
    <main id="main-content">
      <section className="destination-hero">
        <img src={trip.image} alt={trip.alt} className="destination-cover" />
        <div className="shell destination-stage">
          <div>
            <a className="back-link" href="#/experiences"><ArrowLeft size={16} /> All experiences</a>
            <p className="destination-location"><MapPin size={17} /> {trip.location}</p>
            <h1>{place[trip.id]}</h1>
            <p>{trip.line}</p>
          </div>
          <nav className="destination-postcards" aria-label="Explore another destination">
            {trips.map(next => (
              <a key={next.id} href={'#/experiences/' + next.id} aria-current={next.id === trip.id ? 'page' : undefined}>
                <img src={next.image} alt="" />
                <span>{place[next.id]}</span><ArrowUpRight size={16} />
              </a>
            ))}
          </nav>
        </div>
      </section>
      <section className="shell destination-detail">
        <div className="destination-copy">
          <h2>{trip.name}</h2>
          <div className="detail-meta"><span><Clock3 size={17} /> {trip.duration}</span><span><Users size={17} /> Up to {trip.capacity} guests</span></div>
          <p className="destination-description">{trip.description}</p>
          <h3>Itinerary</h3>
          <ol className="timeline">{trip.itinerary.map(item => <li key={item}>{item}</li>)}</ol>
          <h3>Included</h3>
          <ul className="included-list">{trip.includes.map(item => <li key={item}><Check size={17} /> {item}</li>)}</ul>
          <h3>Meeting point</h3>
          <p>{trip.meeting}</p>
        </div>
        <aside className="reservation-card">
          <p className="reservation-price">{money(trip.price)} <span>/ person</span></p>
          <div className="reservation-slot"><CalendarDays size={18} />
            <span>{slots.length ? 'Next departure: ' + dateLabel(slots[0].date) : 'Departures to be announced'}</span>
          </div>
          {!!slots.length && <button className="primary" type="button" onClick={onBook}><Ticket size={17} /> Choose a date <ArrowRight size={17} /></button>}
          <button className="secondary" type="button" onClick={onSave} aria-pressed={saved}><Heart size={17} /> {saved ? 'Saved' : 'Save experience'}</button>
        </aside>
      </section>
    </main>
  )
}
