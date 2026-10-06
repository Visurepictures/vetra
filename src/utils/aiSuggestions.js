import { calculateBudget, calculateDuration, sanitizeNumber } from './calculations.js'

export const suggestionSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    activities: { type: 'array', maxItems: 4, items: { type: 'object', additionalProperties: false, properties: { name: { type: 'string', enum: ['Planejamento', 'Roteiro', 'Deslocamento', 'Preparação de equipamentos', 'Seleção de material', 'Revisão', 'Exportação e entrega'] }, hours: { type: 'number', enum: [0] } }, required: ['name', 'hours'] } },
    questions: { type: 'array', maxItems: 3, items: { type: 'string' } },
  }, required: ['activities', 'questions'],
}
const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : ''
export function aiContext(budget, profile, brief) {
  const result = calculateBudget(budget)
  // Only project scope and pricing context enter inference, never the client directory or documents.
  return {
    description: text(brief, 1500), category: text(budget.category, 40), specialty: text(profile.area, 40),
    scheduledHours: calculateDuration(budget.startAt, budget.endAt),
    activities: (budget.activities || []).slice(0, 12).map(item => ({ name: text(item.name, 100), hours: sanitizeNumber(item.quantity) })),
    pricingMode: result.manual ? 'sale-rate' : 'cost-based',
    priceCalculatedByVetra: result.isValid ? result.sustainablePrice : null,
    profitabilityKnown: budget.costsConfirmed === true && result.knownCost,
    estimatedMargin: budget.costsConfirmed === true ? result.effectiveMargin : null,
    delivery: text(budget.deliveryDeadline, 150),
  }
}
export function validateSuggestion(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid-suggestion')
  const summary = text(value.summary, 600)
  if (!summary || !Array.isArray(value.activities) || !Array.isArray(value.questions) || !Array.isArray(value.observations)) throw new Error('invalid-suggestion')
  if (value.activities.length > 8 || value.questions.length > 6 || value.observations.length > 6) throw new Error('invalid-suggestion')
  const activities = value.activities.map(item => {
    const name = text(item?.name, 100), hours = item?.hours
    if (!name || typeof hours !== 'number' || !Number.isFinite(hours) || hours < 0 || hours > 200) throw new Error('invalid-suggestion')
    return { name, hours }
  })
  const lines = list => list.map(item => { if (typeof item !== 'string' || !item.trim()) throw new Error('invalid-suggestion'); return text(item, 400) })
  // Drop every extra property: model output can never set a price, tax, client or payment.
  return { summary, activities, questions: lines(value.questions), observations: lines(value.observations) }
}
export function appendSuggestedActivities(budget, activities, rate, makeId = () => crypto.randomUUID()) {
  const rows = validateSuggestion({ summary: 'revisado', activities, questions: [], observations: [] }).activities
  if (!rows.length) return budget
  return { ...budget, activities: [...budget.activities, ...rows.map(item => ({ id: makeId(), name: item.name, quantity: item.hours, unitValue: sanitizeNumber(rate) }))] }
}

export function validateModelSuggestion(value, existing = []) {
  const allowed = new Set(suggestionSchema.properties.activities.items.properties.name.enum)
  const normalized = name => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  const seen = new Set(existing.map(item => normalized(item.name)))
  const safe = validateSuggestion({ ...value, summary: 'Etapas para revisar', observations: [] })
  if (safe.activities.length > 4 || safe.questions.length > 3 || safe.activities.some(item => !allowed.has(item.name) || item.hours !== 0)) throw new Error('invalid-model-suggestion')
  safe.activities = safe.activities.filter(item => { const key = normalized(item.name); if (seen.has(key)) return false; seen.add(key); return true })
  return safe
}
