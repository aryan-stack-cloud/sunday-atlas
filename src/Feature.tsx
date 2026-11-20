import { useState, type PointerEvent } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Clock3, MapPin, Pause, Play } from 'lucide-react'
import { money, trips, type Trip } from './trips'

import { Lights, TripDeck } from './TripDeck'

const covers = [import.meta.env.BASE_URL + 'images/delhi-twilight.webp', trips[1].image, trips[2].image]

export function Feature({ onExplore, onOpen }: { onExplore: () => void; onOpen: (trip: Trip) => void }) {
  const [current, setCurrent] = useState(0)
  const trip = trips[current]
  const [paused, setPaused] = useState(false)

  function step(direction: number) {
    setCurrent(index => (index + direction + trips.length) % trips.length)
  }

  function moveScene(event: PointerEvent<HTMLElement>) {
    if (paused || event.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const scene = event.currentTarget
    const box = scene.getBoundingClientRect()
    const x = (event.clientX - box.left) / box.width - 0.5
    const y = (event.clientY - box.top) / box.height - 0.5
    scene.style.setProperty('--scene-x', String(x))
    scene.style.setProperty('--scene-y', String(y))
  }

  return (
    <div className={'motion-story' + (paused ? ' motion-off' : '')}>
      <section className={'feature feature--' + current} aria-labelledby="hero-title" onPointerMove={moveScene}
        onPointerLeave={event => {
          event.currentTarget.style.removeProperty('--scene-x')
          event.currentTarget.style.removeProperty('--scene-y')
        }}>
        {covers.map((cover, index) => (
          <img className={'feature-photo frame-' + index + (index === current ? ' is-current' : '')}
            key={cover} src={cover} alt="" fetchPriority={index === 0 ? 'high' : 'low'} />
        ))}
        <Lights className="hero-lights" />
        <img className="scene-reeds" src={import.meta.env.BASE_URL + 'images/river-reeds.webp'} alt="" />
        <div className="shell feature-layout">
          <div className="feature-copy">
            <p className="section-kicker"><MapPin size={15} /> Day trips from Delhi NCR</p>
            <h1 id="hero-title">Delhi,<br /><em>rediscovered.</em></h1>
            <p>Find small-group walks, workshops and nature escapes around Delhi NCR.</p>
            <a href="#/experiences" className="feature-cta" onClick={onExplore}>Explore trips <ArrowUpRight size={17} /></a>
            <button type="button" className="chapter-link" onClick={() => document.getElementById('trip-deck')?.scrollIntoView()}>
              Trip cards <ArrowDown size={16} />
            </button>
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
        <button type="button" className="motion-control" aria-label={paused ? 'Resume scene motion' : 'Pause scene motion'} aria-pressed={paused}
          onClick={() => setPaused(value => !value)}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>
      </section>
      <TripDeck onOpen={onOpen} />
    </div>
  )
}
