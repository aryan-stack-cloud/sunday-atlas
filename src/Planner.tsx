import { ArrowDown, ArrowUp, ArrowUpRight, CalendarPlus, Check, MapPin, Plus, X } from 'lucide-react'
import { guides, mapLink } from './guide'
import { clockTime, downloadPlan, schedule, transferMinutes, type Planner } from './planning'
import { trips } from './trips'

export function Daybook({ planner }: { planner: Planner }) {
  const { plan, add, edit, remove, move, persistent } = planner
  const rows = schedule(plan)
  return <section className="daybook shell" aria-labelledby="daybook-title">
    <div className="daybook-intro">
      <div><p className="edition-label">Personal itinerary / Delhi NCR</p>
        <h1 id="daybook-title">My <em>daybook.</em></h1>
        <p>Pick your stops, set a start time and take the itinerary with you.</p></div>
      <div className="route-stamp" aria-hidden="true"><span>SUNDAY ATLAS</span><MapPin/><span>DELHI NCR</span></div>
    </div>
    <div className="book-columns">
      <div className="book-spread">
        <div className="book-top"><h2>Your route</h2><span>{rows.length} {rows.length === 1 ? 'stop' : 'stops'}</span></div>
        {rows.length === 0 && <p className="book-hint">Choose a place below to start your day.</p>}
        <ol className="book-stops">{rows.map(({trip, start, end}, i) => <li key={trip.id}>
          <img src={trip.image} alt="" />
          <div><small>{clockTime(start)} – {clockTime(end)}</small><h3><a href={'#/experiences/' + trip.id}>{trip.name}</a></h3>
          <a className="map-directions" href={mapLink(trip)} target="_blank" rel="noreferrer">{trip.location} <ArrowUpRight size={12}/></a></div>
          <div className="stop-actions">
            <button aria-label={'Move ' + trip.name + ' earlier'} disabled={i === 0} onClick={() => move(trip.id, -1)}><ArrowUp size={15}/></button>
            <button aria-label={'Move ' + trip.name + ' later'} disabled={i === rows.length - 1} onClick={() => move(trip.id, 1)}><ArrowDown size={15}/></button>
            <button aria-label={'Remove ' + trip.name + ' from daybook'} onClick={() => remove(trip.id)}><X size={15}/></button></div>
        </li>)}</ol>
        {rows.length > 1 && <p className="book-hint">Includes a {transferMinutes}-minute planning allowance between stops. Actual travel times vary.</p>}
        <h3 className="edition-label">Add a destination</h3>
        <div className="add-places">{trips.map(trip => <button type="button" key={trip.id} disabled={plan.ids.includes(trip.id)}
          onClick={() => add(trip.id)} aria-label={'Add ' + trip.name + ' to daybook'}>
          <img src={trip.image} alt=""/><span>{guides[trip.id].place}</span>{plan.ids.includes(trip.id) ? <Check size={14}/> : <Plus size={14}/>}</button>)}</div>
      </div>
      <div className="book-settings"><h2>Trip details</h2>
        <label>Day of visit<input type="date" value={plan.date} onChange={e => edit('date', e.target.value)} /></label>
        <label>Start time in Delhi<input type="time" value={plan.start} onChange={e => edit('start', e.target.value)} /></label>
        <label>Field notes<textarea rows={3} maxLength={2000} placeholder="What do you want to remember?" value={plan.notes} onChange={e => edit('notes', e.target.value)} /></label>
        <button className="paper-button" disabled={!rows.length || !plan.date || !plan.start} onClick={() => downloadPlan(plan)}><CalendarPlus size={17}/> Export calendar</button>
        <small>{!rows.length || !plan.date || !plan.start ? 'Choose a stop, date and start time to export.' : 'Opens in Google, Apple or Outlook Calendar.'}</small>
        <small role="status">{persistent ? 'Saved in this browser.' : 'Storage is unavailable. Export before closing.'}</small>
      </div>
    </div>
  </section>
}
