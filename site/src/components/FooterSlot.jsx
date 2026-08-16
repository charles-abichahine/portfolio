import { useContext } from 'react'
import { createPortal } from 'react-dom'
import { FooterSlotContext } from './footerSlotContext.js'

/*
 * The middle of the footer, filled by whichever page is on screen.
 *
 * The four footers this replaced existed because each page had something of its
 * own to say down there: the booklet on /work, the map toggle on /about. Giving
 * every page its own footer to hold one control is what let the identity line,
 * the padding and the rule drift apart across four files.
 *
 * A portal rather than a context value, so a page writes markup where it makes
 * sense to read it and React puts it where it belongs. Footer owns the node;
 * App holds it in state, which is what makes the portal appear on the render
 * after the footer mounts.
 */
export default function FooterSlot({ children }) {
  const node = useContext(FooterSlotContext)
  return node ? createPortal(children, node) : null
}
