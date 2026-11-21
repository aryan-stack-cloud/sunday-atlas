import { trips, type Trip } from './trips'

export const guides: Record<string, {
  place: string; subtitle: string; area: string; minutes: number; stops: string[]; tip: string
}> = {
  lodhi: {
    place: 'Lodhi', subtitle: 'Gardens', area: 'Central Delhi', minutes: 120,
    stops: [
      'Begin under the trees at Gate 1. Give your eyes a minute to adjust from the busy road to the garden paths.',
      'Follow the garden circuit between the domes. Look back from the paths to frame the arches through the trees.',
      'Leave time for chai near the gate. The last part of this morning is best left unhurried.',
    ],
    tip: 'Bring walking shoes and leave room in your bag for a water bottle.',
  },
  pottery: {
    place: 'Shahpur', subtitle: 'Jat', area: 'South Delhi', minutes: 150,
    stops: [
      'Start with the studio introduction. Watch how the potter presses the clay into the centre of the wheel.',
      'Wet your hands, pull the walls upwards, then shape the rim. Expect a few attempts before the bowl holds its shape.',
      'The bowl stays in the studio for firing. Ask the potter how to identify and collect your finished piece.',
    ],
    tip: 'Wear sleeves you can roll up. Arrange a studio session before travelling.',
  },
  wetlands: {
    place: 'Okhla', subtitle: 'Wetlands', area: 'Noida', minutes: 180,
    stops: [
      'Start at the sanctuary entrance and check the day’s access before setting off.',
      'Take the path beside the reeds. Pause and listen before looking through the binoculars.',
      'Spend the last stretch at the viewpoints. Look along the edges of the water for movement.',
    ],
    tip: 'Bring water and binoculars if you have them. Check sanctuary opening hours before leaving.',
  },
}

export const cardArt = (trip: Trip) => import.meta.env.BASE_URL + 'images/card-' + trip.id + '.webp'
export const mapLink = (trip: Trip) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(trip.location)
export const tripById = (id: string) => trips.find(trip => trip.id === id)
