import { createContext } from 'react'

/*
 * Its own file so FooterSlot.jsx exports only a component. A file that exports
 * both a component and a context breaks fast refresh, which oxlint flags.
 */
export const FooterSlotContext = createContext(null)
