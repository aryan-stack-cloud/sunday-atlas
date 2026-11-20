import { useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Clock3, MapPin } from 'lucide-react'
import { money, trips, type Trip } from './trips'

const covers = [import.meta.env.BASE_URL + 'images/delhi-illustrated.webp', trips[1].image, trips[2].image]

export function Feature({ onExplore, onOpen }: { onExplore: () => void; onOpen: (trip: Trip) => void }) {
  const [current, setCurrent] = useState(0)
  const trip = trips[current]

  function step(direction: number) {
    setCurrent(index => (index + direction + trips.length) % trips.length)
  }

  return (
    <section className={'feature feature--' + current} aria-labelledby="hero-title">
      {covers.map((cover, index) => (
        <img className={'feature-photo frame-' + index + (index === current ? ' is-current' : '')}
          key={cover} src={cover} alt="" fetchPriority={index === 0 ? 'high' : 'low'} />
      ))}
      <div className="shell feature-layout">
        <div className="feature-copy">
          <p className="section-kicker"><MapPin size={15} /> Day trips from Delhi NCR</p>
          <h1 id="hero-title">Delhi,<br /><em>rediscovered.</em></h1>
          <p>Find small-group walks, workshops and nature escapes around Delhi NCR.</p>
          <a href="#/experiences" className="feature-cta" onClick={onExplore}>Explore trips <ArrowDown size={17} /></a>
        </div>
        <div className="feature-pager" role="group" aria-label="Featured experiences">
          <div className="feature-arrows">
            <button type="button" aria-label="Previous featured trip" onClick={() => step(-1)}><ArrowLeft size={17} /></button>
            <button type="button" aria-label="Next featured trip" onClick={() => step(1)}><ArrowRight size={17} /></button>
          </div>
          <button className="feature-ticket" type="button" onClick={() => onOpen(trip)} aria-label={'Open featured trip: ' + trip.name}>
            <img src={trip.image} width="72" height="70" alt="" />
            <span className="feature-ticket-content" aria-live="polite">
              <span className="feature-label">{trip.category}</span>
              <strong>{trip.name}</strong>
              <span className="feature-facts"><Clock3 size={13} /> {trip.duration} <span>·</span> {money(trip.price)}</span>
            </span>
            <ArrowUpRight size={19} />
          </button>
          <div className="feature-postcards" aria-label="Choose a featured trip">
            {trips.map((item, index) => (
              <button key={item.id} type="button" aria-label={'Feature ' + item.name}
                aria-pressed={index === current} onClick={() => setCurrent(index)}>
                <img src={item.image} alt="" /><span>{item.category}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
