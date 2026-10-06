import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateBudget, getHourlyCost, parseLocalDateTime, calculateDurationParts } from '../src/utils/calculations.js'
import { migrateProposals } from '../src/utils/proposals.js'
import { migrateClientData } from '../src/utils/clients.js'
import { validateBackup } from '../src/utils/storage.js'
const budget = { activities: [{ quantity: 10, unitValue: 100 }], taxes: 6, profitMargin: 20 }
test('price covers costs, taxes and margin without double charging labor', () => {
  const result = calculateBudget(budget)
  assert.ok(Math.abs(result.sustainablePrice - 1351.35135135) < .00001)
  assert.ok(Math.abs(result.sustainablePrice - result.taxAmount - result.profitAmount - 1000) < .00001)
  assert.equal(getHourlyCost({ monthlyGoal: 6000, monthlyCosts: 1200, equipmentReserve: 400, vacationReserve: 400, billableHours: 80 }), 100)
})
test('invalid percentages and overflow cannot become valid quotations', () => {
  for (const rates of [{ taxes: 100, profitMargin: 0 }, { taxes: -1 }, { taxes: 'bad' }, { taxes: 80, profitMargin: 20 }]) assert.equal(calculateBudget({ ...budget, ...rates }).isValid, false)
  assert.equal(calculateBudget({ ...budget, activities: [{ quantity: 1e308, unitValue: 1e308 }] }).isValid, false)
})
test('urgency and expenses receive markup once', () => {
  assert.equal(calculateBudget({ ...budget, taxes: 0, profitMargin: 0, expenses: { food: 100 }, urgent: true }).sustainablePrice, 1375)
})
test('migration preserves old prices and creates stable ids', () => {
  const migrated = migrateProposals([budget, budget, null])
  assert.equal(migrated.length, 2)
  assert.equal(calculateBudget(migrated[0]).sustainablePrice, 1000)
  assert.notEqual(migrated[0].id, migrated[1].id)
  assert.notEqual(migrated[0].proposalNumber, migrated[1].proposalNumber)
  assert.deepEqual(migrateProposals(migrated), migrated)
})
test('deleted client is not resurrected on reload', () => {
  const result = migrateClientData([], [{ clientName: 'Ana', clientDetached: true }])
  assert.equal(result.clients.length, 0)
})
test('dates reject calendar overflow and support overnight work', () => {
  assert.equal(parseLocalDateTime('2026-02-30T12:00'), null)
  assert.equal(calculateDurationParts('2026-09-28T23:30', '2026-09-29T01:00').decimal, 1.5)
})
test('backups reject wrong formats and duplicate identities', () => {
  assert.throws(() => validateBackup({ app: 'other' }))
  assert.throws(() => validateBackup({ app: 'Vetra', version: 1, profile: {}, budgets: [{ id: 'a' }, { id: 'a' }], clients: [] }))
  assert.equal(validateBackup({ app: 'Vetra', version: 1, profile: {}, budgets: [], clients: [] }).version, 1)
})

test('personal pricing separates a sale rate from a cost', () => {
  const current = { ...budget, calculationVersion: 3, priceMode: 'rate', costsConfirmed: true, costHourly: 50, fees: 2 }
  const result = calculateBudget(current)
  assert.equal(result.sustainablePrice, 1000)
  assert.equal(result.profitAmount, 420)
  assert.equal(result.effectiveMargin, 42)
  assert.equal(calculateBudget({ ...current, costsConfirmed: false }).profitAmount, null)
})
test('discount and configurable urgency reconcile to the final price', () => {
  const result = calculateBudget({ ...budget, calculationVersion: 3, fees: 4, urgent: true, urgencyPercent: 10, discount: 100 })
  assert.ok(Math.abs(result.sustainablePrice - (1000 / .7 * 1.1 - 100)) < 1e-9)
  assert.ok(Math.abs(result.sustainablePrice - result.taxAmount - result.feeAmount - result.profitAmount - result.costBasis) < 1e-9)
  assert.equal(calculateBudget({ ...budget, calculationVersion: 3, discount: 99999 }).isValid, false)
})
test('migration preserves each calculation generation', () => {
  for (const calculationVersion of [1,2,3]) {
    const input = { ...budget, calculationVersion, priceMode: 'rate' }
    assert.equal(calculateBudget(migrateProposals([input])[0]).sustainablePrice, calculateBudget(input).sustainablePrice)
  }
})
test('malformed nested backups are rejected before replacing data', () => {
  for (const entry of [{ id: 'a', projectName: {} }, { id: 'a', activities: [{ name: {} }] }, { id: 'a', documents: [null] }]) {
    assert.throws(() => validateBackup({ app: 'Vetra', version: 1, profile: {}, budgets: [entry], clients: [] }))
  }
})
