import { useState } from 'react'
import { cardArt, guides, mapLink } from './guide'
import { BookOpen, ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, Clock3, Heart, MapPin, Ticket, Users } from 'lucide-react'
import { dateLabel, money, trips, type Departure, type Trip } from './trips'

const place: Record<string, string> = { lodhi: 'Lodhi', pottery: 'Shahpur Jat', wetlands: 'Okhla' }

export function Destination({ trip, saved, slots, onSave, onBook, inPlan, onPlan }: {
  inPlan: boolean; onPlan: () => void; trip: Trip; saved: boolean; slots: Departure[]; onSave: () => void; onBook: () => void
}) {
  const [stop, setStop] = useState(0)
  const guide = guides[trip.id]
  return (
    <main id="main-content" className="guide-page">
      <section className="destination-hero">
        <img src={trip.image} alt={trip.alt} className="destination-cover" />
        <div className="shell destination-stage">
          <div>
            <a className="back-link" href="#/experiences"><ArrowLeft size={16} /> All experiences</a>
            <p className="destination-location"><MapPin size={17} /> {trip.location}</p>
            <h1>{place[trip.id]}</h1>
            <p>{trip.line}</p>
            <button className="guide-plan" onClick={onPlan}><BookOpen size={16}/>{inPlan ? "Open my daybook" : "Plan this visit"}<ArrowRight size={15}/></button>
          </div>
          <nav className="destination-postcards" aria-label="Explore another destination">
            {trips.map(next => (
              <a key={next.id} href={'#/experiences/' + next.id} aria-current={next.id === trip.id ? 'page' : undefined}>
                <img src={cardArt(next)} alt="" />
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
          <section className="guide-stops" aria-label="Route stops">
            <p className="edition-label">Inside the itinerary</p><h3>On the route</h3>
            <div className="stop-selector">{trip.itinerary.map((label, index) => <button key={label}
              aria-pressed={stop === index} onClick={() => setStop(index)}>Stop {index + 1}</button>)}</div>
            <div key={stop} className="stop-detail" aria-live="polite"><strong>{trip.itinerary[stop]}</strong><p>{guide.stops[stop]}</p></div>
          </section>
          <h3>Included</h3>
          <ul className="included-list">{trip.includes.map(item => <li key={item}><Check size={17} /> {item}</li>)}</ul>
          <h3>Meeting point</h3>
          <p>{trip.meeting}</p><a className="ink-link" href={mapLink(trip)} target="_blank" rel="noreferrer">Open area in Maps <ArrowUpRight size={15}/></a>
        </div>
        <aside className="reservation-card">
          <img className="guide-print" src={cardArt(trip)} alt="" />
          <p className="edition-label">Guided experience</p><p className="reservation-price">{money(trip.price)} <span>/ person</span></p>
          <div className="reservation-slot"><CalendarDays size={18} />
            <span>{slots.length ? 'Next departure: ' + dateLabel(slots[0].date) : 'Departures to be announced'}</span>
          </div>
          {!!slots.length && <button className="primary" type="button" onClick={onBook}><Ticket size={17} /> Choose a date <ArrowRight size={17} /></button>}
          <button className="secondary" type="button" onClick={onSave} aria-pressed={saved}><Heart size={17} /> {saved ? 'Saved' : 'Save experience'}</button>
        <p className="packing-tip">{guide.tip}</p></aside>
      </section>
      <a className="next-guide" href={'#/experiences/' + trips[(trips.indexOf(trip) + 1) % trips.length].id}>
        <span className="edition-label">Next destination</span><strong>{place[trips[(trips.indexOf(trip) + 1) % trips.length].id]}</strong><ArrowRight size={30}/></a>
    </main>
  )
}
