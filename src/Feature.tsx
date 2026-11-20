import { useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Clock3, MapPin } from 'lucide-react'
import { money, trips, type Trip } from './trips'

const covers = [import.meta.env.BASE_URL + 'images/atlas-hero.webp', trips[1].image, trips[2].image]

export function Feature({ onExplore, onOpen }: { onExplore: () => void; onOpen: (trip: Trip) => void }) {
  const [current, setCurrent] = useState(0)
  const trip = trips[current]

  function step(direction: number) {
    setCurrent(index => (index + direction + trips.length) % trips.length)
  }

  return (
    <section className="feature" aria-labelledby="hero-title">
      {covers.map((cover, index) => (
        <img className={'feature-photo frame-' + index + (index === current ? ' is-current' : '')}
          key={cover} src={cover} alt="" fetchPriority={index === 0 ? 'high' : 'low'} />
      ))}
      <div className="shell feature-layout">
        <div className="feature-copy">
          <p className="section-kicker"><MapPin size={15} /> Day trips from Delhi NCR</p>
          <h1 id="hero-title">The city<br />can <em>wait.</em></h1>
          <p>Walk old gardens, get your hands in clay, or watch the wetlands wake up. A different weekend is closer than you think.</p>
          <a href="#explore" className="feature-cta" onClick={onExplore}>Explore trips <ArrowDown size={17} /></a>
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
          <div className="feature-pips" aria-label="Choose a featured trip">
            {trips.map((item, index) => (
              <button key={item.id} type="button" aria-label={'Feature ' + item.name}
                aria-pressed={index === current} onClick={() => setCurrent(index)} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
