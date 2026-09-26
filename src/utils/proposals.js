const proposalStatuses = ['Rascunho', 'Orçamento enviado', 'Orçamento aprovado', 'Contrato aguardando assinatura', 'Contrato assinado', 'Em produção', 'Entregue', 'Concluído', 'Cancelado']

export const PROPOSAL_STATUSES = proposalStatuses

export const defaultContractSettings = {
  contractorType: 'Pessoa física',
  contractorName: '',
  contractorDocument: '',
  contractorPhone: '',
  contractorEmail: '',
  contractorAddress: '',
  legalRepresentative: '',
  servicePurpose: '',
  includedServices: '',
  excludedServices: '',
  estimatedDeliverables: '',
  deliveryFormat: '',
  deliveryDeadline: '',
  includedRevisions: 1,
  rawMaterialIncluded: false,
  rawFilesIncluded: false,
  editableProjectsIncluded: false,
  depositPercentage: 50,
  remainingPaymentCondition: '',
  paymentMethod: '',
  extraHourValue: 0,
  reschedulingPolicy: '',
  cancellationPolicy: '',
  fileStorageTime: '',
  imageLicense: '',
  imageUseOption: 'Não autoriza divulgação pública',
  portfolioUse: false,
  websiteSocialUse: false,
  institutionalUse: false,
}

export const defaultProposalFields = {
  proposalNumber: '',
  status: 'Rascunho',
  issueDate: '',
  proposalValidityDays: 10,
  serviceLocation: '',
  deliveryDeadline: '',
  includedRevisions: 1,
  estimatedDeliverables: '',
  deliveryFormat: '',
  includedServices: '',
  excludedServices: '',
  paymentMethod: '',
  depositPercentage: 50,
  remainingPaymentCondition: '',
  extraHourValue: 0,
  reschedulingPolicy: '',
  cancellationPolicy: '',
  imageUseOption: 'Não autoriza divulgação pública',
  usagePurpose: '',
  contractGenerated: false,
  contractSigned: false,
  imageAuthorizations: [],
  documents: [],
  contractSettings: defaultContractSettings,
}

const localDateValue = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function nextProposalNumber(budgets = [], date = new Date()) {
  const year = date.getFullYear()
  const prefix = `VET-${year}-`
  const used = new Set(budgets.map((budget) => budget.proposalNumber).filter(Boolean))
  let sequence = 1
  while (used.has(`${prefix}${String(sequence).padStart(4, '0')}`)) sequence += 1
  return `${prefix}${String(sequence).padStart(4, '0')}`
}

export function migrateProposal(budget, budgets = []) {
  const migrated = { ...defaultProposalFields, ...budget }
  migrated.activities = Array.isArray(migrated.activities) ? migrated.activities.map((activity) => ({ id: activity?.id || crypto.randomUUID(), name: activity?.name || 'Atividade', quantity: activity?.quantity ?? 0, unitValue: activity?.unitValue ?? 0 })) : []
  migrated.expenses = { transport: 0, equipment: 0, food: 0, other: 0, ...(migrated.expenses && typeof migrated.expenses === 'object' ? migrated.expenses : {}) }
  migrated.urgent = Boolean(migrated.urgent)
  const existingNumber = budget?.proposalNumber
  migrated.proposalNumber = existingNumber || nextProposalNumber(budgets, new Date())
  migrated.status = proposalStatuses.includes(migrated.status) ? migrated.status : 'Rascunho'
  migrated.issueDate = migrated.issueDate || localDateValue()
  migrated.imageAuthorizations = Array.isArray(migrated.imageAuthorizations) ? migrated.imageAuthorizations : []
  migrated.documents = Array.isArray(migrated.documents) ? migrated.documents : []
  migrated.contractSettings = { ...defaultContractSettings, ...(migrated.contractSettings || {}) }
  return migrated
}

export function migrateProposals(value) {
  if (!Array.isArray(value)) return []
  const result = []
  value.forEach((budget, index) => {
    let migrated = migrateProposal(budget || {}, result, index)
    if (result.some((item) => item.proposalNumber === migrated.proposalNumber)) {
      migrated = { ...migrated, proposalNumber: nextProposalNumber(result) }
    }
    result.push(migrated)
  })
  return result
}

export function proposalStatusLabel(status) {
  return proposalStatuses.includes(status) ? status : 'Rascunho'
}
