import { useEffect, useState } from 'react'
import { calculateBudget, calculateDurationParts, formatCurrency, getHourlyCost, isDateRangeValid, parseLocalDateTime, reviewBudget, sanitizeNumber, toLocalDateTimeValue } from '../utils/calculations'
import { readStorage, removeStorage, writeStorage } from '../utils/storage'
import DateTimePickerModal from './DateTimePickerModal'

const templates = {
  Ensaio: ['Planejamento', 'Captação', 'Seleção e edição', 'Entrega'],
  Evento: ['Planejamento', 'Captação', 'Seleção e edição', 'Entrega'],
  Vídeo: ['Roteiro e planejamento', 'Captação', 'Edição e finalização', 'Entrega'],
}
export default function BudgetEditor({ profile, initialBudget, clients, createBudget, onBack, onProfile, onNewClient, onSave }) {
  const draftKey = `vetra-draft-${initialBudget?.id || 'new'}`
  const [budget, setBudget] = useState(() => {
    const draft = readStorage(draftKey, null)
    if (draft?.activities && Array.isArray(draft.activities) && draft.expenses && typeof draft.projectName === 'string') return draft
    return initialBudget ? { ...initialBudget } : createBudget()
  })
  const [step, setStep] = useState(0)
  const [datePicker, setDatePicker] = useState(null)
  const [message, setMessage] = useState('')
  const [draftStatus, setDraftStatus] = useState('')
  const [review, setReview] = useState(false)
  const result = calculateBudget(budget)
  const duration = calculateDurationParts(budget.startAt, budget.endAt)
  const datesValid = isDateRangeValid(budget.startAt, budget.endAt, { allowPast: Boolean(initialBudget?.id) })
  const isOld = budget.calculationVersion < 3
  const manual = budget.priceMode === 'rate'
  const update = (key, value) => setBudget(current => ({ ...current, [key]: value }))
  const number = (key, value) => update(key, value === '' ? '' : sanitizeNumber(value))
  useEffect(() => {
    const timer = setTimeout(() => setDraftStatus(writeStorage(draftKey, budget) ? 'Rascunho salvo neste navegador' : 'Falha ao salvar rascunho — mantenha esta página aberta'), 500)
    return () => clearTimeout(timer)
  }, [budget, draftKey])
  useEffect(() => {
    const select = (event) => {
      const selection = event.detail
      if (!selection || typeof selection !== 'object') return
      setBudget(current => ({ ...current, clientId: selection.id, clientName: selection.name }))
    }
    window.addEventListener('vetra-client-selected', select)
    return () => window.removeEventListener('vetra-client-selected', select)
  }, [])
  const leave = (action) => { if (writeStorage(draftKey, budget) || window.confirm('O rascunho não pôde ser salvo. Sair mesmo assim?')) action() }
  const save = () => {
    if (!budget.projectName.trim() || !budget.clientName.trim()) { setMessage('Preencha o projeto e o cliente no primeiro passo.'); setStep(0); return }
    if (!datesValid || !result.isValid || result.sustainablePrice <= 0) { setMessage('Revise datas, atividades e percentuais antes de salvar.'); return }
    if (!manual && !isOld && !budget.costsConfirmed) { setMessage('Confirme seus custos no Perfil ou use sua tarifa de venda.'); return }
    if (onSave(budget) === false) { setMessage('Não foi possível salvar. O formulário continua aberto para você recuperar os dados.'); return }
    removeStorage(draftKey)
  }
  const changeMode = (mode) => {
    const rate = mode === 'cost' ? getHourlyCost(profile) : sanitizeNumber(profile.manualRate)
    setBudget(current => ({ ...current, priceMode: mode, calculationVersion: 3, costsConfirmed: profile.costsConfirmed === true, costHourly: getHourlyCost(profile), taxes: profile.taxes, fees: profile.fees || 0, profitMargin: profile.profitMargin, activities: current.activities.map(item => ({ ...item, unitValue: rate })) }))
  }
  const applyTemplate = (name) => {
    if (!window.confirm('Substituir as atividades por este modelo? Revise todas as horas antes de salvar.')) return
    const rate = manual ? sanitizeNumber(profile.manualRate) : getHourlyCost(profile)
    update('activities', templates[name].map(label => ({ id: crypto.randomUUID(), name: label, quantity: label === 'Captação' ? duration.decimal : 0, unitValue: rate })))
  }
  const updateDate = (value) => setBudget(current => {
    const next = { ...current, [datePicker]: value }
    const start = parseLocalDateTime(next.startAt), end = parseLocalDateTime(next.endAt)
    if (datePicker === 'startAt' && start && (!end || end <= start)) next.endAt = toLocalDateTimeValue(new Date(start.getTime() + 3600000))
    return next
  })
  const updateActivity = (id, key, value) => update('activities', budget.activities.map(item => item.id === id ? { ...item, [key]: key === 'name' ? value : value === '' ? '' : sanitizeNumber(value) } : item))
  return <main className="page-wrap app-page guided-editor">
    <header className="editor-bar"><button className="back-link" onClick={() => leave(onBack)}>← Voltar ao painel</button><span role="status">{draftStatus}</span></header>
    <section className="subpage-heading"><span className="eyebrow">DO ESCOPO À PROPOSTA</span><h1>{initialBudget?.id ? 'Editar orçamento' : 'Criar orçamento'}</h1><p>Seus dados, seu trabalho, um preço explicado.</p></section>
    <nav className="editor-steps" aria-label="Etapas do orçamento">{['Trabalho', 'Tempo e gastos', 'Preço', 'Revisão'].map((name, index) => <button key={name} aria-current={step === index ? 'step' : undefined} onClick={() => setStep(index)}><span>{index + 1}</span>{name}</button>)}</nav>
    <div className="editor-layout"><div className="editor-main">
      {step === 0 && <section className="glass-panel form-panel"><h2>O que você vai realizar?</h2><div className="input-grid two">
        <Field label="Nome do projeto" value={budget.projectName} onChange={value => update('projectName', value)} placeholder="Ex.: Ensaio de marca pessoal" />
        <Field label="Categoria" value={budget.category} onChange={value => update('category', value)} options={['fotografia','vídeo','foto e vídeo']} />
        <label className="field"><span>Cliente cadastrado</span><select value={budget.clientId || ''} onChange={event => { const client = clients.find(item => item.id === event.target.value); setBudget(current => ({ ...current, clientId: client?.id || '', clientName: client ? client.name || client.companyName : current.clientName })) }}><option value="">Informar um nome abaixo</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name || client.companyName}</option>)}</select></label>
        <Field label="Nome do cliente" value={budget.clientName} onChange={value => setBudget(current => ({ ...current, clientName: value, clientId: '' }))} />
      </div><button className="text-button" onClick={onNewClient}>＋ Cadastrar cliente</button><label className="field"><span>Descreva o trabalho e as entregas</span><textarea value={budget.notes || ''} placeholder="Objetivo, local, quantidade de fotos ou vídeos e detalhes importantes." onChange={event => update('notes', event.target.value)} /></label>
      <div className="input-grid two">{[['startAt','Início'],['endAt','Final']].map(([key,label]) => <label className="field" key={key}><span>{label}</span><button className="date-field" onClick={() => setDatePicker(key)}>{formatDate(budget[key])} ⌄</button></label>)}</div>{!datesValid && <p className="date-error">O final deve ser posterior ao início. Para um novo orçamento, escolha hoje ou uma data futura.</p>}<p className="form-help">Agenda: {duration.hours}h {duration.minutes}min. As horas de preparação e edição são informadas separadamente.</p></section>}
      {step === 1 && <><section className="glass-panel form-panel"><h2>Tempo e atividades</h2><p className="form-help">Inclua todo o trabalho. Os modelos organizam etapas; você define as horas reais.</p><div className="template-actions">{Object.keys(templates).map(name => <button className="button button-secondary" key={name} onClick={() => applyTemplate(name)}>Modelo: {name}</button>)}</div><button className="text-button" onClick={() => update('activities', budget.activities.map(item => /captação/i.test(item.name) ? { ...item, quantity: duration.decimal } : item))}>Usar duração da agenda na captação ({duration.decimal.toLocaleString('pt-BR')} h)</button>
      <div className="activity-list">{budget.activities.map(item => <div className="activity-row" key={item.id}><Field label="Atividade" value={item.name} onChange={value => updateActivity(item.id,'name',value)} /><Field label="Horas / quantidade" type="number" value={item.quantity} onChange={value => updateActivity(item.id,'quantity',value)} /><Field label={manual ? 'Tarifa de venda (R$)' : 'Custo unitário (R$)'} type="number" value={item.unitValue} onChange={value => updateActivity(item.id,'unitValue',value)} /><strong>{formatCurrency(sanitizeNumber(item.quantity) * sanitizeNumber(item.unitValue))}</strong><button aria-label={`Excluir ${item.name}`} onClick={() => update('activities', budget.activities.filter(row => row.id !== item.id))}>×</button></div>)}</div><button className="text-button" onClick={() => update('activities', [...budget.activities, { id: crypto.randomUUID(), name: '', quantity: 0, unitValue: manual ? sanitizeNumber(profile.manualRate) : getHourlyCost(profile) }])}>＋ Adicionar atividade</button></section>
      <section className="glass-panel form-panel"><h2>Gastos deste projeto</h2><p className="form-help">Inclua apenas gastos específicos. Seus custos fixos já entram no custo por hora quando você usa esse modo.</p><div className="input-grid">{[['transport','Transporte'],['equipment','Aluguel de equipamentos'],['food','Alimentação'],['other','Outros gastos']].map(([key,label]) => <Field key={key} label={`${label} (R$)`} type="number" value={budget.expenses[key]} onChange={value => update('expenses', { ...budget.expenses, [key]: value === '' ? '' : sanitizeNumber(value) })} />)}</div></section></>}
      {step === 2 && <section className="glass-panel form-panel"><h2>Como você quer definir o preço?</h2>{isOld ? <div className="notice"><p>Este orçamento usa uma versão anterior do cálculo. Seu preço será preservado até você decidir atualizar.</p><button className="button" onClick={() => { if (window.confirm('Atualizar o cálculo deste orçamento? O preço poderá mudar.')) setBudget(current => ({ ...current, calculationVersion: 3, priceMode: 'cost', costsConfirmed: true, urgencyPercent: current.urgent ? 25 : 0 })) }}>Atualizar cálculo deste orçamento</button></div> : <div className="pricing-modes"><button aria-pressed={manual} onClick={() => changeMode('rate')}>Já tenho minha tarifa</button><button aria-pressed={!manual} onClick={() => changeMode('cost')}>Calcular pelos meus custos</button></div>}
      <button className="text-button" onClick={() => { if (window.confirm('Substituir as tarifas e percentuais deste orçamento pelos dados atuais do Perfil?')) changeMode(manual ? 'rate' : 'cost') }}>Atualizar tarifas e percentuais do Perfil</button>
      <p className="form-help">{manual ? 'Os valores das atividades são preços de venda. Impostos e taxas serão descontados do total para avaliar o resultado; não são adicionados novamente.' : 'Os valores das atividades são custos internos. O preço cobre os custos, impostos, taxas e a margem desejada.'}</p>
      {!budget.costsConfirmed && <div className="notice"><p>Rentabilidade pendente de avaliação. Confirme seus dados para comparar o preço com seus custos.</p><button className="text-button" onClick={() => leave(onProfile)}>Configurar minha tarifa e custos ↗</button></div>}
      {!manual && <Field label="Margem desejada (%)" type="number" value={budget.profitMargin} onChange={value => number('profitMargin',value)} />}
      <details className="optional-fields"><summary>Ajustes opcionais · impostos e taxas ({Number(budget.taxes || 0) + Number(budget.fees || 0)}%)</summary><div className="input-grid"><Field label="Impostos sobre a venda (%)" type="number" value={budget.taxes} onChange={value => number('taxes',value)} /><Field label="Comissões e taxas (%)" type="number" value={budget.fees || 0} onChange={value => number('fees',value)} /></div><p className="form-help"><strong>O que são os impostos?</strong> É o percentual do valor faturado que você destina a tributos sobre este serviço. A Vetra não identifica seu regime tributário nem calcula obrigações fiscais. Informe o percentual aplicável com orientação do seu contador; não copie os 6% do exemplo. Tributos fixos mensais já incluídos nos custos não devem ser somados novamente aqui. O valor inicial 0% significa apenas que nada foi informado, não que você seja isento.</p></details><label className="check-item"><input type="checkbox" checked={Boolean(budget.urgent)} onChange={event => update('urgent',event.target.checked)} />Entrega urgente</label>{budget.urgent && <Field label="Acréscimo de urgência (%) — definido por você" type="number" value={budget.urgencyPercent ?? 25} onChange={value => number('urgencyPercent',value)} />}{!isOld && <Field label="Desconto no preço final (R$)" type="number" value={budget.discount || 0} onChange={value => number('discount',value)} />}
      <p className="form-help">{manual ? 'Preço = atividades + gastos + urgência − desconto.' : 'Referência = custos ÷ (1 − impostos − taxas − margem). Urgência e desconto ajustam o preço final.'}</p></section>}
      {step === 3 && <section className="glass-panel form-panel"><h2>Entrega, pagamento e revisão</h2><div className="input-grid two">{[['serviceLocation','Local do serviço'],['includedServices','Entregas incluídas'],['deliveryDeadline','Prazo de entrega'],['deliveryFormat','Formato de entrega'],['paymentMethod','Forma de pagamento'],['remainingPaymentCondition','Condição do saldo']].map(([key,label]) => <Field key={key} label={label} value={budget[key] || ''} onChange={value => update(key,value)} />)}<Field label="Reserva (%)" type="number" value={budget.depositPercentage} onChange={value => number('depositPercentage',Math.min(100,Number(value)))} /><Field label="Validade (dias)" type="number" value={budget.proposalValidityDays} onChange={value => number('proposalValidityDays',value)} /></div><details className="optional-fields"><summary>Condições adicionais</summary>{[['excludedServices','Itens não incluídos'],['cancellationPolicy','Cancelamento'],['reschedulingPolicy','Reagendamento']].map(([key,label]) => <Field key={key} label={label} value={budget[key] || ''} onChange={value => update(key,value)} />)}</details><button className="button button-secondary" onClick={() => setReview(true)}>Revisar meu orçamento</button>{review && <div className="notice"><strong>Verificação de consistência</strong><p>Regras locais sobre os dados preenchidos. Não usa IA e não envia seus dados.</p><ul>{reviewBudget(budget).length ? reviewBudget(budget).map(note => <li key={note}>{note}</li>) : <li>Nenhuma pendência detectada nestas verificações. Revise o escopo antes de enviar.</li>}</ul></div>}</section>}
      <div className="step-actions"><button className="button button-secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>Anterior</button>{step < 3 ? <button className="button" onClick={() => setStep(step + 1)}>Continuar →</button> : <button className="button" onClick={save}>Salvar orçamento</button>}</div>{message && <p className="date-error" role="alert">{message}</p>}
    </div><aside className="quote-panel"><span className="card-kicker">SEU RESUMO</span><h2>{manual ? 'Seu preço' : 'Referência pelos custos'}</h2><div className="quote-total">{result.isValid ? formatCurrency(result.sustainablePrice) : 'Revise os dados'}</div><Line label={manual ? 'Serviços pela sua tarifa' : 'Custo das atividades'} value={result.services} /><Line label="Gastos do projeto" value={result.expenses} /><Line label="Urgência" value={result.urgency} /><Line label="Desconto" value={result.discount} /><Line label="Impostos incluídos" value={result.taxAmount} /><Line label="Taxas incluídas" value={result.feeAmount} />{result.knownCost && (budget.costsConfirmed || isOld) ? <><Line label="Base para cobrir custos e taxas" value={result.minimumPrice} /><Line label="Resultado estimado após custos" value={result.profitAmount} /><p className="form-help">Margem estimada: {result.effectiveMargin?.toFixed(1) ?? '0'}%. Sua remuneração está incluída no custo.</p></> : <p className="notice">Rentabilidade pendente: faltam custos confirmados.</p>}{!result.isValid && <p className="date-error">Revise os percentuais e o desconto. Os encargos precisam deixar espaço para os custos.</p>}<p className="form-help">{isOld ? 'Cálculo histórico preservado.' : 'Estimativa baseada nos dados informados, não em preços de mercado.'}</p></aside></div>
    {datePicker && <DateTimePickerModal allowPast={Boolean(initialBudget?.id)} title={datePicker === 'startAt' ? 'Data de início' : 'Data final'} value={budget[datePicker]} onConfirm={value => { updateDate(value); setDatePicker(null) }} onCancel={() => setDatePicker(null)} />}
  </main>
}
function Field({ label, value, onChange, type = 'text', options, placeholder }) { return <label className="field"><span>{label}</span>{options ? <select value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option}>{option}</option>)}</select> : <input type={type} step={type === 'number' ? 'any' : undefined} min={type === 'number' ? 0 : undefined} value={value ?? ''} placeholder={placeholder} onChange={event => onChange(event.target.value)} />}</label> }
function Line({ label, value }) { return <div className="line"><span>{label}</span><b>{value === null ? 'Pendente' : formatCurrency(value)}</b></div> }
function formatDate(value) { const date = parseLocalDateTime(value); return date ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : 'Selecionar data e horário' }
