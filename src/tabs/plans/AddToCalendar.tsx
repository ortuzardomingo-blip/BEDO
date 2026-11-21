import { CalendarPlus } from 'lucide-react'
import { downloadIcs, googleCalendarUrl } from '../../lib/utils'

/** Botones para llevar un evento al calendario del celular (con aviso un día antes en .ics) */
export function AddToCalendar({
  title,
  date,
  details = '',
  yearly = false,
}: {
  title: string
  date: string
  details?: string
  yearly?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <a
        className="btn-outline h-9 text-xs"
        href={googleCalendarUrl(title, date, details, yearly)}
        target="_blank"
        rel="noreferrer"
      >
        <CalendarPlus size={14} /> Google Calendar
      </a>
      <button className="btn-outline h-9 text-xs" onClick={() => downloadIcs(title, date, details, yearly)}>
        <CalendarPlus size={14} /> iPhone / Outlook
      </button>
    </div>
  )
}
