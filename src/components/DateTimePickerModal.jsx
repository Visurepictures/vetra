import { useEffect, useMemo, useState } from 'react'
import { parseLocalDateTime, toLocalDateTimeValue } from '../utils/calculations'

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const pad = (value) => String(value).padStart(2, '0')
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const startOfToday = () => { const today = new Date(); today.setHours(0, 0, 0, 0); return today }
const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1)

function calendarDays(month) {
  const first = startOfMonth(month)
  const days = []
  for (let index = 0; index < first.getDay(); index += 1) days.push(null)
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  for (let day = 1; day <= lastDay; day += 1) days.push(new Date(month.getFullYear(), month.getMonth(), day))
  return days
}

export default function DateTimePickerModal({ value, onConfirm, onCancel, title, allowPast = false }) {
  const initial = parseLocalDateTime(value) || new Date()
  const [selectedDate, setSelectedDate] = useState(initial)
  const [month, setMonth] = useState(startOfMonth(initial))
  const [hours, setHours] = useState(initial.getHours())
  const [minutes, setMinutes] = useState(initial.getMinutes())
  const [timeMode, setTimeMode] = useState('hours')
  const [initialValue] = useState(value)
  const today = startOfToday()
  const days = useMemo(() => calendarDays(month), [month])
  const changed = toLocalDateTimeValue(selectedDateWithTime(selectedDate, hours, minutes)) !== initialValue
  const selectedValue = selectedDateWithTime(selectedDate, hours, minutes)
  const preview = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(selectedValue)

  useEffect(() => {
    const handleKeyDown = (event) => { if (event.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  const chooseDay = (day) => { if (day && (allowPast || day >= today)) setSelectedDate(day) }
  const previousMonth = () => setMonth((current) => { const previous = new Date(current.getFullYear(), current.getMonth() - 1, 1); const currentMonthIndex = current.getFullYear() * 12 + current.getMonth(); const todayMonthIndex = today.getFullYear() * 12 + today.getMonth(); return !allowPast && currentMonthIndex <= todayMonthIndex ? current : previous })
  const nextMonth = () => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
  const chooseToday = () => { setSelectedDate(today); setMonth(startOfMonth(today)) }
  const closeOutside = (event) => { if (event.target === event.currentTarget && !changed) onCancel() }

  return <div className="date-modal-backdrop" role="presentation" onMouseDown={closeOutside}><section className="date-modal" role="dialog" aria-modal="true" aria-labelledby="date-picker-title">
    <div className="date-modal-header"><div><span className="card-kicker">SELECIONE</span><h2 id="date-picker-title">{title}</h2></div><button className="modal-close" onClick={onCancel} aria-label="Fechar seletor">×</button></div>
    <div className="calendar-header"><button onClick={previousMonth} aria-label="Mês anterior">‹</button><strong>{new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(month)}</strong><button onClick={nextMonth} aria-label="Próximo mês">›</button></div>
    <div className="calendar-grid calendar-weekdays">{weekDays.map((day) => <span key={day}>{day}</span>)}</div>
    <div className="calendar-grid calendar-days">{days.map((day, index) => { const isToday = day && dateKey(day) === dateKey(today); const isSelected = day && dateKey(day) === dateKey(selectedDate); const disabled = !day || (!allowPast && day < today); return <button key={day ? dateKey(day) : `empty-${index}`} className={`${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`} disabled={disabled} onClick={() => chooseDay(day)} aria-label={day ? day.toLocaleDateString('pt-BR') : undefined}>{day?.getDate()}</button> })}</div>
    <button className="today-button" onClick={chooseToday}>Hoje</button>
    <div className="time-section"><div className="time-heading"><span className="time-label">Horário</span><div className="time-mode"><button className={timeMode === 'hours' ? 'is-active' : ''} onClick={() => setTimeMode('hours')}>Horas</button><button className={timeMode === 'minutes' ? 'is-active' : ''} onClick={() => setTimeMode('minutes')}>Minutos</button></div></div><div className="time-entry"><label>Hora<input aria-label="Hora" type="number" min="0" max="23" value={hours} onChange={(e) => setHours(Math.min(23, Math.max(0, Number(e.target.value))))} /></label><b>:</b><label>Minuto<input aria-label="Minuto" type="number" min="0" max="59" value={minutes} onChange={(e) => setMinutes(Math.min(59, Math.max(0, Number(e.target.value))))} /></label></div><div className="single-time-dial">{(timeMode === 'hours' ? Array.from({ length: 24 }, (_, i) => i) : Array.from({ length: 12 }, (_, i) => i * 5)).map((value) => { const hour = timeMode === 'hours'; const angle = (hour ? value % 12 : value / 5) * Math.PI / 6 - Math.PI / 2; const radius = hour && (value === 0 || value > 12) ? 27 : 42; const selected = hour ? hours === value : minutes === value; return <button aria-label={`${pad(value)} ${hour ? 'horas' : 'minutos'}`} aria-pressed={selected} key={value} className={selected ? 'is-selected' : ''} style={{ left: `${50 + Math.cos(angle) * radius}%`, top: `${50 + Math.sin(angle) * radius}%` }} onClick={() => hour ? (setHours(value), setTimeMode('minutes')) : setMinutes(value)}>{pad(value)}</button> })}</div></div>
    <p className="date-preview">{preview} às <strong>{pad(hours)}:{pad(minutes)}</strong></p>
    <div className="modal-actions"><button className="button button-secondary" onClick={onCancel}>Cancelar</button><button className="button" onClick={() => onConfirm(toLocalDateTimeValue(selectedValue))}>Confirmar</button></div>
  </section></div>
}

function selectedDateWithTime(date, hours, minutes) { const result = new Date(date); result.setHours(hours, minutes, 0, 0); return result }
