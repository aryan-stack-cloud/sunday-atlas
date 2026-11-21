import { useRef, useState, type PointerEvent } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Compass, Pause, Play } from 'lucide-react'
import { trips, type Trip } from './trips'

import { cardArt, guides } from './guide'
import { useScrollStory } from './useScrollStory'
import { Lights, TripDeck } from './TripDeck'

const covers = [import.meta.env.BASE_URL + 'images/lodhi-panorama.webp', trips[1].image, trips[2].image]

export function Feature({ onExplore, onOpen }: { onExplore: () => void; onOpen: (trip: Trip) => void }) {
  const [current, setCurrent] = useState(0)
  const trip = trips[current]
  const guide = guides[trip.id]
  const [paused, setPaused] = useState(false)
  const story = useRef<HTMLDivElement>(null)
  useScrollStory(story, paused)

  function showCards() {
    const element = story.current
    if (element?.classList.contains('scroll-story')) {
      const top = window.scrollY + element.getBoundingClientRect().top
      window.scrollTo({ top: top + (element.offsetHeight - innerHeight) * .44, behavior: 'smooth' })
    } else {
      document.getElementById('trip-deck')?.scrollIntoView()
    }
  }

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
    <div ref={story} className={'motion-story' + (paused ? ' motion-off' : '')}>
      <div className="story-stage">
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
        <div className="shell feature-layout">
          <div key={trip.id} className="feature-copy">
            <p className="section-kicker"><span className="rule" /> Delhi field guide <span>/</span> {trip.category}</p>
            <h1 id="hero-title">{guide.place}<br /><em>{guide.subtitle}.</em></h1>
            <p>{trip.line}</p>
            <button className="feature-cta" type="button" aria-label={'Open featured trip: ' + trip.name} onClick={() => onOpen(trip)}>Open field guide <ArrowUpRight size={17} /></button>
            <button type="button" className="chapter-link" onClick={showCards}>Trip cards <ArrowDown size={16}/></button>
          </div>
          <div className="feature-pager" role="group" aria-label="Featured experiences">
            <div className="feature-arrows"><span className="edition-label">Postcards / 0{current + 1} of 03</span>
              <button type="button" aria-label="Previous featured trip" onClick={() => step(-1)}><ArrowLeft size={16}/></button>
              <button type="button" aria-label="Next featured trip" onClick={() => step(1)}><ArrowRight size={16}/></button>
            </div>
            <div className="feature-postcards">{trips.map((item, index) =>
              <button key={item.id} type="button" aria-label={'Feature ' + item.name}
                aria-pressed={index === current} onClick={() => setCurrent(index)}>
                <img src={cardArt(item)} alt=""/><span>{guides[item.id].place}</span>
              </button>)}</div>
          </div>
          <div className="feature-colophon"><span><Compass size={15}/> {trip.location}</span><a href="#/experiences" onClick={onExplore}>Browse the atlas <ArrowUpRight size={15}/></a></div>
        </div>
      </section>
      <TripDeck onOpen={onOpen} active={current} onSelect={setCurrent} />
        <button type="button" className="motion-control" aria-label={paused ? 'Resume scene motion' : 'Pause scene motion'} aria-pressed={paused}
          onClick={() => setPaused(value => !value)}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>
        <div className="scroll-progress" aria-hidden="true"><span /></div>
      </div>
    </div>
  )
}
