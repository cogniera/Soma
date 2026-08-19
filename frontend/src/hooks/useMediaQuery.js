import { useCallback, useSyncExternalStore } from 'react'

/**
 * Subscribes to a CSS media query. Screens that position themselves with inline
 * styles cannot be re-laid-out from a stylesheet — inline wins — so they read
 * the breakpoint here instead and pick the layout in JS.
 */
export default function useMediaQuery(query) {
  const subscribe = useCallback((onChange) => {
    const mql = window.matchMedia(query)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query])

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}

/**
 * The one breakpoint the app switches layouts at. Width alone is not enough:
 * a window far taller than it is wide (a tablet held upright, a tall desktop
 * window) has the pixels for the wide layout but none of the shape for it.
 * Kept in sync with the media queries in App.css and Landing.css.
 */
export const MOBILE_QUERY = '(max-width: 899px), (max-aspect-ratio: 4/5)'
