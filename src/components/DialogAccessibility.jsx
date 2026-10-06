import { useEffect } from 'react'

export default function DialogAccessibility() {
  useEffect(() => {
    let current, opener
    const selector = '[role="dialog"], .client-form'
    const focusables = (el) => [...el.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')].filter((node) => !node.disabled && node.getClientRects().length)
    const sync = () => {
      const dialogs = [...document.querySelectorAll(selector)]
      const next = dialogs.at(-1)
      if (current === next) return
      if (!current && next) opener = document.activeElement
      current = next
      if (next) focusables(next)[0]?.focus()
      else if (opener?.isConnected) opener.focus()
      document.body.classList.toggle('has-dialog', Boolean(next))
    }
    const observer = new MutationObserver(sync)
    observer.observe(document.body, { childList: true, subtree: true })
    const key = (event) => {
      if (!current) return
      if (event.key === 'Escape') { current.querySelector('.modal-close, .preview-actions button')?.click(); return }
      if (event.key !== 'Tab') return
      const list = focusables(current), first = list[0], last = list.at(-1)
      if (event.shiftKey && (document.activeElement === first || !current.contains(document.activeElement))) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && (document.activeElement === last || !current.contains(document.activeElement))) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', key); sync()
    return () => { observer.disconnect(); document.removeEventListener('keydown', key); document.body.classList.remove('has-dialog') }
  }, [])
  return null
}
