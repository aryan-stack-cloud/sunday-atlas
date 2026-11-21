import { useEffect, type RefObject } from 'react'

const clamp = (value: number) => Math.min(1, Math.max(0, value))
const smooth = (value: number) => value * value * (3 - 2 * value)

/** One native scroll range drives all three scenes without changing document scroll. */
export function useScrollStory(ref: RefObject<HTMLDivElement | null>, paused: boolean) {
  useEffect(() => {
    const story = ref.current
    if (!story) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    const hero = story.querySelector<HTMLElement>('.feature')
    const cards = story.querySelector<HTMLElement>('.deck-chapter')
    const note = story.querySelector<HTMLElement>('.field-note')
    const deck = story.querySelector<HTMLElement>('.trip-deck')

    function render() {
      frame = 0
      if (!story) return
      const enabled = !paused && !reduced.matches && window.innerHeight >= 520
      story.classList.toggle('scroll-story', enabled)
      if (!enabled) {
        if (deck) deck.style.removeProperty('pointer-events')
        for (const panel of [hero, cards, note]) if (panel) panel.inert = false
        return
      }
      const rect = story.getBoundingClientRect()
      const range = Math.max(1, story.offsetHeight - window.innerHeight)
      const progress = clamp(-rect.top / range)
      const toCards = smooth(clamp((progress - .08) / .25))
      const toNote = smooth(clamp((progress - .64) / .25))
      const rotate = clamp((progress - .30) / .32)
      story.style.setProperty('--landscape-exit', String(toCards))
      story.style.setProperty('--note-entry', String(toNote))
      story.style.setProperty('--card-turn', String(rotate))
      story.style.setProperty('--story-progress', String(progress))
      if (hero) hero.inert = toCards > .55
      if (cards) cards.inert = toCards < .55 || toNote > .55
      if (note) note.inert = toNote < .55
      if (deck) deck.style.pointerEvents = toCards < .55 ? 'none' : 'auto'
    }
    function request() {
      if (!frame) frame = requestAnimationFrame(render)
    }
    render()
    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', request)
    reduced.addEventListener('change', request)
    return () => {
      window.removeEventListener('scroll', request)
      window.removeEventListener('resize', request)
      reduced.removeEventListener('change', request)
      cancelAnimationFrame(frame)
      story.classList.remove('scroll-story')
      for (const panel of [hero, cards, note]) if (panel) panel.inert = false
    }
  }, [ref, paused])
}
