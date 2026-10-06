const blockedKeys = new Set()
export const WORKSPACE_KEY = 'vetra-workspace-v1'
export function loadWorkspace() {
  const value = readStorage(WORKSPACE_KEY, null)
  if (!value) return null
  try { return validateBackup(value) } catch { blockedKeys.add(WORKSPACE_KEY); return null }
}
export function saveWorkspace(data, { restore = false } = {}) {
  try {
    if (!restore && blockedKeys.size) throw new Error('Existing data needs recovery')
    const value = validateBackup({ ...data, app: 'Vetra', version: 1 })
    // One write keeps profile, clients and proposals together, even when quota is exceeded.
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(value))
    if (restore) blockedKeys.clear()
    window.dispatchEvent(new Event('vetra-storage-saved'))
    return true
  } catch {
    window.dispatchEvent(new Event('vetra-storage-error'))
    return false
  }
}
export function removeStorage(key) {
  try { localStorage.removeItem(key); return true } catch { return false }
}
export function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    const value = JSON.parse(raw)
    if (Array.isArray(fallback) ? !Array.isArray(value) : fallback && typeof fallback === 'object' ? !value || typeof value !== 'object' || Array.isArray(value) : false) throw new Error('Invalid storage shape')
    return value
  } catch {
    blockedKeys.add(key)
    return fallback
  }
}
export function writeStorage(key, value) {
  try {
    if (blockedKeys.has(key)) throw new Error('Original data preserved')
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    window.dispatchEvent(new Event('vetra-storage-error'))
    return false
  }
}
export function downloadFile(name, content, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function validateBackup(value) {
  if (!value || value.app !== 'Vetra' || value.version !== 1 || !value.profile || typeof value.profile !== 'object' || Array.isArray(value.profile) || !Array.isArray(value.budgets) || !Array.isArray(value.clients)) throw new Error('Arquivo de backup da Vetra inválido.')
  for (const list of [value.budgets, value.clients]) {
    if (list.some((item) => !item || typeof item !== 'object' || Array.isArray(item) || typeof item.id !== 'string' || !item.id)) throw new Error('Há registros inválidos neste backup.')
    if (new Set(list.map((item) => item.id)).size !== list.length) throw new Error('Há identificadores duplicados neste backup.')
  }
  const scalarRecord = (record, nested = []) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Registro inválido no backup.')
    for (const [key, item] of Object.entries(record)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Campo inválido no backup.')
      if (!nested.includes(key) && item !== null && !['string', 'number', 'boolean'].includes(typeof item)) throw new Error('Campo inválido no backup.')
      if (typeof item === 'number' && !Number.isFinite(item)) throw new Error('Número inválido no backup.')
    }
  }
  scalarRecord(value.profile)
  for (const client of value.clients) {
    scalarRecord(client, ['tags'])
    if (client.tags !== undefined && (!Array.isArray(client.tags) || client.tags.some((tag) => typeof tag !== 'string'))) throw new Error('Tags inválidas no backup.')
  }
  for (const budget of value.budgets) {
    scalarRecord(budget, ['activities', 'expenses', 'contractSettings', 'imageAuthorizations', 'documents', 'profileSnapshot'])
    for (const key of ['activities', 'imageAuthorizations', 'documents']) {
      if (budget[key] !== undefined && !Array.isArray(budget[key])) throw new Error('Lista inválida no backup.')
      for (const item of budget[key] || []) scalarRecord(item)
    }
    for (const key of ['expenses', 'contractSettings', 'profileSnapshot']) if (budget[key] !== undefined) scalarRecord(budget[key])
  }
  return value
}
