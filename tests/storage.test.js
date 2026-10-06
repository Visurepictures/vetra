import test from 'node:test'
import assert from 'node:assert/strict'
import { saveWorkspace, loadWorkspace, readStorage, WORKSPACE_KEY } from '../src/utils/storage.js'
import { calculateClientMetrics } from '../src/utils/clients.js'

test('workspace writes are atomic; failure and corruption preserve recoverable data', () => {
  const store = new Map()
  const oldStorage = globalThis.localStorage, oldWindow = globalThis.window
  let quota = false
  globalThis.window = new EventTarget()
  globalThis.localStorage = {
    getItem: key => store.get(key) ?? null,
    setItem: (key,value) => { if (quota) throw new Error('quota'); store.set(key,value) },
  }
  try {
    const original = { profile: { professionalName: 'Teste' }, budgets: [], clients: [] }
    assert.equal(saveWorkspace(original), true)
    const raw = store.get(WORKSPACE_KEY)
    quota = true
    assert.equal(saveWorkspace({ ...original, clients: [{ id: 'new' }] }), false)
    assert.equal(store.get(WORKSPACE_KEY), raw)
    quota = false
    assert.equal(loadWorkspace().profile.professionalName, 'Teste')
    store.set('broken-old-data', '{broken')
    readStorage('broken-old-data', [])
    assert.equal(saveWorkspace(original), false)
    assert.equal(store.get('broken-old-data'), '{broken')
    assert.equal(saveWorkspace(original, { restore: true }), true)
    assert.equal(loadWorkspace().budgets.length, 0)
  } finally { globalThis.localStorage = oldStorage; globalThis.window = oldWindow }
})
test('approved budgets are contracted amounts, not payments or contacts', () => {
  const base = { clientId: 'c', calculationVersion: 3, priceMode: 'rate', activities: [{ quantity: 1, unitValue: 1000 }], status: 'Orçamento aprovado', startAt: '2026-10-10T10:00' }
  const result = calculateClientMetrics({ id: 'c', lastContactAt: '2026-09-01' }, [{ ...base, amountReceived: 200 }, { ...base, status: 'Cancelado', amountReceived: 500 }])
  assert.equal(result.contracted, 1000)
  assert.equal(result.received, 700)
  assert.equal(result.outstanding, 800)
  assert.equal(result.lastActivityAt, '2026-10-10T10:00')
  assert.equal(result.lastContactAt, undefined)
})
