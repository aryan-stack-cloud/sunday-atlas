import { useState } from 'react'
import { ArrowUpRight, Compass, MapPin } from 'lucide-react'
import { type Trip, trips } from './trips'
import { cardArt, guides } from './guide'

export function AtlasMap({ onOpen }: { onOpen: (trip: Trip) => void }) {
  const [selected, setSelected] = useState(trips[0])
  const guide = guides[selected.id]
  return <section className="atlas-map shell" aria-label="Illustrated destination map">
    <div className="map-paper">
      <img src={import.meta.env.BASE_URL + 'images/delhi-map.webp'} alt="" />
      <span className="map-compass" aria-hidden="true">N<Compass size={27} /></span>
      {trips.map(trip => <button key={trip.id} type="button" className={'map-pin pin-' + trip.id}
        onClick={() => setSelected(trip)} aria-pressed={trip.id === selected.id} aria-label={'Locate ' + trip.location}>
        <MapPin size={16} />{guides[trip.id].place}</button>)}
      <small className="map-caption">Delhi NCR · Illustrated map</small>
    </div>
    <div className="map-legend" key={selected.id} aria-live="polite">
      <img className="map-specimen" src={cardArt(selected)} alt="" />
      <div><p className="edition-label">{guide.area} / {selected.category}</p>
      <h2>{guide.place} <em>{guide.subtitle}</em></h2>
      <p>{selected.line}</p>
      <button className="ink-link" onClick={() => onOpen(selected)}>Read the guide <ArrowUpRight size={17}/></button></div>
    </div>
  </section>
}
