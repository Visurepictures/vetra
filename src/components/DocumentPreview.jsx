import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { calculateBudget, formatCurrency } from '../utils/calculations'

export default function DocumentPreview({ budget, profile, authorization, onClose }) {
  const title = authorization ? 'Autorização de uso de imagem' : 'Contrato de prestação de serviços'
  const settings = budget.contractSettings || {}
  useEffect(() => () => document.body.classList.remove('printing-document'), [])
  const print = () => {
    document.body.classList.add('printing-document')
    window.addEventListener('afterprint', () => document.body.classList.remove('printing-document'), { once: true })
    window.print()
  }
  const rows = authorization ? [
    ['Pessoa retratada', authorization.subjectName], ['CPF', authorization.cpf], ['E-mail', authorization.email],
    ...(authorization.type === 'minor' ? [['Data de nascimento', authorization.birthDate], ['Representante legal', authorization.legalRepresentative], ['CPF do representante', authorization.representativeCpf], ['Relação', authorization.relationship]] : []),
    ['Finalidade autorizada', authorization.purpose], ['Meios de divulgação', authorization.means], ['Prazo', authorization.term],
    ['Uso comercial', authorization.commercialUse ? 'Sim' : 'Não'], ['Identificação pelo nome', authorization.nameIdentification ? 'Sim' : 'Não'], ['Observações', authorization.observations],
  ] : [
    ['Profissional', profile.fullName || profile.commercialName || profile.professionalName], ['CPF / CNPJ do profissional', profile.cpfCnpj], ['Contato profissional', [profile.email, profile.phone].filter(Boolean).join(' · ')],
    ['Contratante', settings.contractorName || budget.clientName], ['CPF / CNPJ do contratante', settings.contractorDocument], ['Endereço do contratante', settings.contractorAddress],
    ['Projeto', budget.projectName], ['Data e horário', `${budget.startAt?.replace('T', ' ')} — ${budget.endAt?.replace('T', ' ')}`], ['Local', budget.serviceLocation],
    ['Atividades', (budget.activities || []).map((a) => `${a.name}: ${a.quantity} unidade(s)/hora(s)`).join('; ')], ['Entregas', budget.includedServices || settings.estimatedDeliverables], ['Itens não incluídos', budget.excludedServices],
    ['Valor total', formatCurrency(calculateBudget(budget).sustainablePrice)], ['Reserva', `${budget.depositPercentage ?? 50}%`], ['Forma de pagamento', budget.paymentMethod], ['Condição do saldo', budget.remainingPaymentCondition],
    ['Prazo de entrega', budget.deliveryDeadline], ['Formato', budget.deliveryFormat], ['Revisões incluídas', String(budget.includedRevisions ?? 1)],
    ['Cancelamento', settings.cancellationPolicy], ['Reagendamento', settings.reschedulingPolicy], ['Armazenamento', settings.fileStorageTime], ['Licença de uso', settings.imageLicense || settings.imageUseOption],
  ]
  return createPortal(<div className="document-overlay print-overlay"><section className="preview-shell" role="dialog" aria-modal="true" aria-label={title}><div className="preview-toolbar"><h2>{title}</h2><div className="preview-actions"><button className="button button-secondary" onClick={onClose}>Fechar</button><button className="button" onClick={print}>Imprimir / salvar PDF</button></div></div><article className="legal-document"><div className="a4-brand">V · Vetra</div><p>{budget.proposalNumber}</p><h1>{title}</h1><p className="document-note">Minuta para revisão das partes. Preencha os campos pendentes antes da assinatura. O registro no aplicativo não constitui assinatura digital.</p><dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'A preencher pelas partes'}</dd></div>)}</dl><div className="signatures"><p>Local e data: ___________________________________</p><p>{authorization ? 'Pessoa retratada / representante legal' : 'Contratante'}: ___________________________________</p><p>Profissional: ___________________________________</p></div></article></section></div>, document.body)
}
