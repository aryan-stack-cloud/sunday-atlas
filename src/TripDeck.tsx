import { useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Clock3, MapPin } from 'lucide-react'
import { money, trips, type Trip } from './trips'

const illustrations = import.meta.env.BASE_URL + 'images/'

export function Lights({ className = '' }: { className?: string }) {
  return (
    <div className={'scene-lights ' + className} aria-hidden="true">
      {Array.from({ length: 13 }, (_, index) => <i key={index} />)}
    </div>
  )
}

export function TripDeck({ onOpen }: { onOpen: (trip: Trip) => void }) {
  const [active, setActive] = useState(1)
  const [revealed, setRevealed] = useState(false)
  const trip = trips[active]

  function step(direction: number) {
    setActive(index => (index + direction + trips.length) % trips.length)
    setRevealed(false)
  }

  function flip(index: number) {
    setRevealed(index !== active || !revealed)
    setActive(index)
  }

  return (
    <section id="trip-deck" className="trip-deck" aria-labelledby="deck-title">
      <div className="shell deck-shell">
        <div className="deck-heading">
          <div>
            <p className="section-kicker">Day trips around Delhi NCR</p>
            <h2 id="deck-title">Pick a card. Find a trip.</h2>
          </div>
          <div className="deck-controls" aria-label="Browse trip cards" role="group">
            <button type="button" aria-label="Previous trip card" onClick={() => step(-1)}><ArrowLeft size={20} /></button>
            <span aria-live="polite">{active + 1} / {trips.length}</span>
            <button type="button" aria-label="Next trip card" onClick={() => step(1)}><ArrowRight size={20} /></button>
          </div>
        </div>
        <div className="deck-cards">
          {trips.map((item, index) => (
            <button type="button" key={item.id} className="deck-card"
              data-active={index === active} aria-pressed={index === active && revealed}
              aria-label={'Reveal ' + item.name} onClick={() => flip(index)}>
              <span className="deck-card-flip">
                <span className="deck-card-face">
                  <img src={illustrations + 'card-' + item.id + '.webp'} alt="" width="360" height="560" loading="lazy" />
                  <span className="deck-card-title"><small>{item.category}</small><strong>{item.name}</strong></span>
                </span>
                <span className="deck-card-details" aria-hidden="true">
                  <MapPin size={27} />
                  <small>{item.location}</small>
                  <strong>{item.name}</strong>
                  <span>{item.line}</span>
                  <span>{item.duration} · {money(item.price)} per person</span>
                </span>
              </span>
            </button>
          ))}
        </div>
        <article className="field-note" key={trip.id}>
          <div className="field-note-visual" aria-hidden="true">
            <img src={illustrations + 'card-' + trip.id + '.webp'} alt="" width="360" height="560" loading="lazy" />
            <Lights />
          </div>
          <div className="field-note-info">
            <p className="section-kicker">{trip.category} <span>·</span> {trip.location}</p>
            <h3>{trip.name}</h3>
            <p>{trip.description}</p>
            <div className="field-note-meta"><Clock3 size={17} /> {trip.duration} <span>·</span> {money(trip.price)} per person</div>
            <button type="button" className="primary" onClick={() => onOpen(trip)}>View itinerary <ArrowUpRight size={17} /></button>
          </div>
        </article>
      </div>
    </section>
  )
}
