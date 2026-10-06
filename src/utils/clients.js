import { calculateBudget } from './calculations.js'

const clientTypes = ['pessoa_fisica', 'pessoa_juridica']
const clientStatuses = ['ativo', 'inativo']

export const CLIENT_SOURCES = ['Instagram', 'WhatsApp', 'Indicação', 'Site', 'Universidade', 'Igreja', 'Evento', 'TikTok', 'Facebook', 'Google', 'Outro']

export const defaultClient = {
  id: '',
  createdAt: '',
  updatedAt: '',
  type: 'pessoa_fisica',
  status: 'ativo',
  name: '',
  companyName: '',
  contactName: '',
  cpf: '',
  cnpj: '',
  phone: '',
  email: '',
  instagram: '',
  website: '',
  address: '',
  city: '',
  state: '',
  notes: '',
  source: 'Outro',
  tags: [],
  favorite: false,
  proposalCount: 0,
  approvedProposalCount: 0,
  totalRevenue: 0,
  lastContactAt: '',
  nextContactAt: '',
  relationshipStatus: 'novo',
}

export function normalizeClient(value = {}) {
  const client = { ...defaultClient, ...value }
  client.type = clientTypes.includes(client.type) ? client.type : 'pessoa_fisica'
  client.status = clientStatuses.includes(client.status) ? client.status : 'ativo'
  client.tags = Array.isArray(client.tags) ? client.tags.filter(Boolean) : []
  client.favorite = Boolean(client.favorite)
  return client
}

export function clientDisplayName(client) {
  return client.type === 'pessoa_juridica' ? client.companyName || client.contactName || 'Empresa sem nome' : client.name || 'Cliente sem nome'
}

export function clientKey(name) { return String(name || '').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ') }

export function createClient(data = {}) { const now = new Date().toISOString(); return normalizeClient({ ...data, id: data.id || crypto.randomUUID(), createdAt: data.createdAt || now, updatedAt: now }) }

export function calculateClientMetrics(client, budgets) {
  const related = budgets.filter((budget) => budget.clientId === client.id)
  const approved = related.filter((budget) => ['Orçamento aprovado', 'Contrato aguardando assinatura', 'Contrato assinado', 'Em produção', 'Entregue', 'Concluído'].includes(budget.status))
  const contracted = approved.reduce((sum, budget) => sum + calculateBudget(budget).sustainablePrice, 0)
  const received = related.reduce((sum, budget) => sum + Math.max(0, Number(budget.amountReceived) || 0), 0)
  const latest = related.map((budget) => budget.startAt || budget.issueDate || '').filter(Boolean).sort().at(-1) || client.lastContactAt || ''
  return { proposalCount: related.length, approvedProposalCount: approved.length, totalRevenue: contracted, contracted, received, outstanding: approved.reduce((sum, budget) => sum + Math.max(0, calculateBudget(budget).sustainablePrice - Math.max(0, Number(budget.amountReceived) || 0)), 0), lastActivityAt: latest }
}

export function refreshClientMetrics(clients, budgets) { return clients.map((client) => ({ ...client, ...calculateClientMetrics(client, budgets) })) }

export function migrateClientData(rawClients, rawBudgets) {
  const clients = Array.isArray(rawClients) ? rawClients.filter((item) => item && typeof item === 'object' && !Array.isArray(item)).map((item) => normalizeClient({ ...item, id: item.id || crypto.randomUUID() })) : []
  const byKey = new Map()
  clients.forEach((client) => { const key = clientKey(clientDisplayName(client)); if (key) byKey.set(key, client) })
  const budgets = Array.isArray(rawBudgets) ? rawBudgets.map((budget) => {
    if (budget.clientId || budget.clientDetached) return budget
    const key = clientKey(budget.clientName)
    if (!key) return budget
    let client = byKey.get(key)
    if (!client) { client = createClient({ name: budget.clientName, contactName: budget.clientName }); clients.push(client); byKey.set(key, client) }
    return { ...budget, clientId: client.id }
  }) : []
  return { clients: refreshClientMetrics(clients, budgets), budgets }
}
