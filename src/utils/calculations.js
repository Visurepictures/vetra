export function sanitizeNumber(value, fallback = 0) { const number = Number(value); return Number.isFinite(number) && number >= 0 ? number : fallback }
export function getHourlyCost(profile = {}) { const need = sanitizeNumber(profile.monthlyGoal) + sanitizeNumber(profile.monthlyCosts) + sanitizeNumber(profile.equipmentReserve) + sanitizeNumber(profile.vacationReserve); const hours = sanitizeNumber(profile.billableHours); return hours > 0 && Number.isFinite(need / hours) ? need / hours : 0 }
export function calculateDuration(startAt, endAt) { return calculateDurationParts(startAt, endAt).decimal }
export function parseLocalDateTime(value) { if (!value || typeof value !== 'string') return null; const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/); if (!match) return null; const [, year, month, day, hours, minutes] = match; const parts = [Number(year), Number(month), Number(day), Number(hours), Number(minutes)]; if (month < 1 || month > 12 || day < 1 || day > 31 || hours > 23 || minutes > 59) return null; const date = new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], 0, 0); return Number.isNaN(date.getTime()) || date.getFullYear() !== parts[0] || date.getMonth() !== parts[1] - 1 || date.getDate() !== parts[2] || date.getHours() !== parts[3] || date.getMinutes() !== parts[4] ? null : date }
export function toLocalDateTimeValue(date) { if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''; const pad = (value) => String(value).padStart(2, '0'); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}` }
export function createDefaultDateRange() { const start = new Date(); start.setSeconds(0, 0); start.setMinutes(Math.ceil(start.getMinutes() / 5) * 5); if (start.getMinutes() === 60) { start.setHours(start.getHours() + 1, 0) } const end = new Date(start.getTime() + 3600000); return { startAt: toLocalDateTimeValue(start), endAt: toLocalDateTimeValue(end) } }
export function calculateDurationParts(startAt, endAt) { const start = parseLocalDateTime(startAt); const end = parseLocalDateTime(endAt); if (!start || !end || end <= start) return { hours: 0, minutes: 0, decimal: 0 }; const totalMinutes = Math.round((end - start) / 60000); return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60, decimal: totalMinutes / 60 } }
export function isDateRangeValid(startAt, endAt, { allowPast = false } = {}) { const start = parseLocalDateTime(startAt); const end = parseLocalDateTime(endAt); if (!start || !end || end <= start) return false; if (!allowPast) { const today = new Date(); today.setHours(0, 0, 0, 0); if (start < today) return false } return true }
export function calculateBudget(budget = {}) {
  const activities = Array.isArray(budget.activities) ? budget.activities : []
  const services = activities.reduce((sum, activity) => sum + sanitizeNumber(activity?.quantity) * sanitizeNumber(activity?.unitValue), 0)
  const hours = activities.reduce((sum, activity) => sum + sanitizeNumber(activity?.quantity), 0)
  const expenses = Object.values(budget.expenses && typeof budget.expenses === 'object' ? budget.expenses : {}).reduce((sum, value) => sum + sanitizeNumber(value), 0)
  const directCost = services + expenses
  const taxes = Number(budget.taxes ?? 0) / 100
  const fees = Number(budget.fees ?? 0) / 100
  const margin = Number(budget.profitMargin ?? 0) / 100
  const legacy = budget.calculationVersion === 1
  const current = budget.calculationVersion >= 3
  const manual = current && budget.priceMode === 'rate'
  const divisor = 1 - taxes - fees - margin
  const urgencyRate = budget.urgent ? Number(budget.urgencyPercent ?? 25) / 100 : 0
  const discount = current ? Number(budget.discount ?? 0) : 0
  const valid = [directCost, taxes, fees, margin, urgencyRate, discount].every(Number.isFinite) && taxes >= 0 && fees >= 0 && margin >= 0 && urgencyRate >= 0 && discount >= 0 && taxes + fees < 1 && (manual || divisor > 0)
  const beforeUrgency = valid ? (manual || legacy ? directCost : directCost / divisor) : 0
  const urgency = current ? beforeUrgency * urgencyRate : directCost * urgencyRate
  const suggestedPrice = current ? beforeUrgency + urgency : valid ? (legacy ? directCost + urgency : (directCost + urgency) / divisor) : 0
  const sustainablePrice = Math.max(0, suggestedPrice - discount)
  const knownCost = !manual || (budget.costsConfirmed === true && Number(budget.costHourly) > 0)
  const costBasis = manual ? hours * sanitizeNumber(budget.costHourly) + expenses : directCost
  const minimumPrice = valid && knownCost ? costBasis / (1 - taxes - fees) : null
  const taxAmount = sustainablePrice * taxes
  const feeAmount = sustainablePrice * fees
  const profitAmount = knownCost ? sustainablePrice - taxAmount - feeAmount - costBasis : null
  return { services, expenses, urgency, directCost, hours, costBasis, minimumPrice, sustainablePrice, suggestedPrice, discount, taxAmount, feeAmount, profitAmount, effectiveMargin: sustainablePrice > 0 && profitAmount !== null ? profitAmount / sustainablePrice * 100 : null, knownCost, manual, legacy, isValid: valid && Number.isFinite(sustainablePrice) && discount <= suggestedPrice }
}

export function reviewBudget(budget, result = calculateBudget(budget)) {
  const notes = []
  if (!budget.costsConfirmed) notes.push('Confirme seus custos no Perfil para avaliar a rentabilidade com seus próprios dados.')
  if (!result.isValid) notes.push('Revise percentuais e desconto: o cálculo ainda não é válido.')
  if (result.knownCost && result.minimumPrice !== null && result.sustainablePrice < result.minimumPrice) notes.push('O preço está abaixo do necessário para cobrir os custos e taxas informados.')
  const capture = budget.activities?.find((item) => /capta|filmagem|fotografia/i.test(item.name))
  const duration = calculateDuration(budget.startAt, budget.endAt)
  if (capture && duration > 0 && Math.abs(Number(capture.quantity) - duration) > .01) notes.push('As horas de captação diferem da agenda. Confira se isso é intencional.')
  if (!budget.activities?.some((item) => /edi|sele|pós/i.test(item.name) && Number(item.quantity) > 0)) notes.push('Confira se edição e seleção estão incluídas nas horas ou no escopo.')
  if (!budget.deliveryDeadline) notes.push('Defina o prazo de entrega antes de apresentar a proposta.')
  if (!budget.paymentMethod) notes.push('Informe a forma de pagamento para evitar dúvidas do cliente.')
  return notes
}
export function formatCurrency(value) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(value) ? value : 0) }
