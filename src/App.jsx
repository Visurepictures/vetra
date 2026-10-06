import { useEffect, useState } from 'react'
import { calculateBudget, formatCurrency, getHourlyCost, sanitizeNumber, createDefaultDateRange } from './utils/calculations'
import BudgetEditor from './components/BudgetEditor'
import ProposalDetails from './components/ProposalDetails'
import ClientsView, { ClientForm } from './components/ClientsView'
import ClientDetails from './components/ClientDetails'
import LandingPage from './components/LandingPage'
import ThemePreview from './components/ThemePreview'
import { migrateProposals, migrateProposal } from './utils/proposals'
import { migrateClientData, refreshClientMetrics, createClient } from './utils/clients'
import { GlassCard, NumericInput, PrimaryButton, SecondaryButton, GhostButton } from './components/ui'
import DialogAccessibility from './components/DialogAccessibility'
import BackupPanel from './components/BackupPanel'
import { readStorage, writeStorage, loadWorkspace, saveWorkspace } from './utils/storage'
import './App.css'
import './audit.css'

const PROFILE_KEY = 'vetra-profile'
const BUDGETS_KEY = 'vetra-budgets'
const defaultProfile = { professionalName: '', commercialName: '', fullName: '', cpfCnpj: '', phone: '', email: '', address: '', instagram: '', site: '', pixKey: '', defaultPaymentMethod: '', defaultDeliveryDeadline: '', defaultValidityDays: 10, defaultDepositPercentage: 50, defaultRevisions: 1, defaultCancellationPolicy: '', defaultReschedulingPolicy: '', defaultStorageTime: '', area: 'ambos', monthlyGoal: 0, monthlyCosts: 0, equipmentReserve: 0, vacationReserve: 0, billableHours: 0, taxes: 0, fees: 0, profitMargin: 0, manualRate: 0, costsConfirmed: false }
const createActivity = (name, hourlyCost) => ({ id: crypto.randomUUID(), name, quantity: name === 'Captação' ? 1 : 0, unitValue: hourlyCost })
const createEmptyBudget = (profile = {}) => { const dates = createDefaultDateRange(); const hourlyCost = getHourlyCost(profile); return { id: null, calculationVersion: 3, priceMode: profile.costsConfirmed ? 'cost' : 'rate', costHourly: hourlyCost, costsConfirmed: profile.costsConfirmed === true, fees: sanitizeNumber(profile.fees), urgencyPercent: 0, discount: 0, projectName: '', clientName: '', category: 'fotografia', notes: '', startAt: dates.startAt, endAt: dates.endAt, activities: [createActivity('Captação', profile.costsConfirmed ? hourlyCost : sanitizeNumber(profile.manualRate)), createActivity('Edição', profile.costsConfirmed ? hourlyCost : sanitizeNumber(profile.manualRate))], expenses: { transport: 0, equipment: 0, food: 0, other: 0 }, taxes: sanitizeNumber(profile.taxes), profitMargin: sanitizeNumber(profile.profitMargin), urgent: false, proposalValidityDays: sanitizeNumber(profile.defaultValidityDays, 10), depositPercentage: sanitizeNumber(profile.defaultDepositPercentage, 50), includedRevisions: sanitizeNumber(profile.defaultRevisions, 1), paymentMethod: profile.defaultPaymentMethod || '', deliveryDeadline: profile.defaultDeliveryDeadline || '', cancellationPolicy: profile.defaultCancellationPolicy || '', reschedulingPolicy: profile.defaultReschedulingPolicy || '', fileStorageTime: profile.defaultStorageTime || '' } }

function Logo() { return <span className="logo-mark" aria-hidden="true">V</span> }
function Button({ children, variant = 'primary', ...props }) { const Component = variant === 'secondary' ? SecondaryButton : variant === 'ghost' ? GhostButton : PrimaryButton; return <Component {...props}>{children}</Component> }

export default function App() {
  const [storedWorkspace] = useState(loadWorkspace)
  const [profile, setProfile] = useState(() => ({ ...defaultProfile, ...(storedWorkspace?.profile || readStorage(PROFILE_KEY, {})) }))
  const [initialClientData] = useState(() => migrateClientData(storedWorkspace?.clients || readStorage('vetra-clients', []), migrateProposals(storedWorkspace?.budgets || readStorage(BUDGETS_KEY, []))))
  const [budgets, setBudgets] = useState(() => initialClientData.budgets)
  const [clients, setClients] = useState(() => initialClientData.clients)
  const [view, setView] = useState(() => { const params = new URLSearchParams(window.location.search); if (params.get('theme-test') === 'true') return 'theme-test'; return params.get('landing') === 'true' || !readStorage('vetra-started', false) ? 'landing' : 'dashboard' })
  const [editingBudget, setEditingBudget] = useState(null)
  const [selectedProposal, setSelectedProposal] = useState(null)
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientFormOpen, setClientFormOpen] = useState(false)
  const [storageError, setStorageError] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  useEffect(() => {
    const fail = () => setStorageError('Não foi possível salvar neste navegador. Exporte uma cópia de segurança antes de fechar a página.')
    const success = () => { setStorageError(''); setSaveStatus('Salvo neste navegador · ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })) }
    window.addEventListener('vetra-storage-error', fail); window.addEventListener('vetra-storage-saved', success)
    return () => { window.removeEventListener('vetra-storage-error', fail); window.removeEventListener('vetra-storage-saved', success) }
  }, [])
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [view])
  const persist = (next) => {
    if (!saveWorkspace(next)) return false
    setStorageError(''); setSaveStatus('Salvo neste navegador · ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    return true
  }
  const restoreBackup = (data) => {
    const migrated = migrateClientData(data.clients, migrateProposals(data.budgets))
    const next = { profile: { ...defaultProfile, ...data.profile }, clients: migrated.clients, budgets: migrated.budgets }
    if (!saveWorkspace(next, { restore: true })) return false
    setProfile(next.profile); setClients(next.clients); setBudgets(next.budgets)
    setSelectedProposal(null); setSelectedClient(null); setStorageError(''); setSaveStatus('Backup restaurado neste navegador')
    return true
  }
  useEffect(() => {
    saveWorkspace({ profile, budgets, clients })
  }, [profile, budgets, clients])
  const start = () => { writeStorage('vetra-started', 'true'); setView('dashboard') }
  const edit = (budget = null) => { setEditingBudget(budget); setView('editor') }
  const openProposal = (budget) => { setSelectedProposal(budget); setView('details') }
  const openClient = (client) => { setSelectedClient(client); setView('client-details') }
  const saveClient = (client) => {
    const saved = createClient(client)
    const nextClients = refreshClientMetrics(clients.some((item) => item.id === saved.id) ? clients.map((item) => item.id === saved.id ? saved : item) : [...clients, saved], budgets)
    if (!persist({ profile, budgets, clients: nextClients })) return false
    setClients(nextClients); setClientFormOpen(false)
    if (view === 'editor') window.dispatchEvent(new CustomEvent('vetra-client-selected', { detail: { id: saved.id, name: saved.name || saved.companyName } }))
    else setSelectedClient(saved)
    return true
  }
  const deleteClient = (id) => {
    if (!window.confirm('Excluir este cliente? As propostas serão preservadas. Exporte um backup se precisar recuperá-lo.')) return
    const nextClients = clients.filter((client) => client.id !== id)
    const nextBudgets = budgets.map((budget) => budget.clientId === id ? { ...budget, clientId: '', clientDetached: true } : budget)
    if (!persist({ profile, clients: nextClients, budgets: nextBudgets })) return
    setClients(nextClients); setBudgets(nextBudgets)
  }
  const saveBudget = (budget, nextView = 'details') => {
    const proposal = migrateProposal({ ...budget, updatedAt: new Date().toISOString(), profileSnapshot: budget.profileSnapshot || { ...profile } }, budgets)
    const nextBudgets = budgets.some((item) => item.id === proposal.id) ? budgets.map((item) => item.id === proposal.id ? proposal : item) : [proposal, ...budgets]
    const nextClients = refreshClientMetrics(clients, nextBudgets)
    if (!persist({ profile, budgets: nextBudgets, clients: nextClients })) return false
    setBudgets(nextBudgets); setClients(nextClients); setSelectedProposal(proposal); setView(nextView)
    return true
  }
  const onNewClientFromEditor = () => setClientFormOpen(true)
  const deleteBudget = (id) => { if (window.confirm('Excluir este orçamento? Exporte um backup se precisar recuperá-lo.')) { const next = budgets.filter((item) => item.id !== id); if (persist({ profile, budgets: next, clients })) setBudgets(next) } }
  const isWorkspace = ['dashboard', 'proposals', 'clients', 'profile'].includes(view)
  return <div className="app-shell"><DialogAccessibility />{view !== 'landing' && <div className="save-status" role="status">{storageError ? 'Alterações não salvas' : saveStatus}</div>}{storageError && <div className="storage-alert" role="alert">{storageError}<button onClick={() => setView('profile')}>Abrir backup</button></div>}
    {isWorkspace ? <main className="page-wrap app-page workspace-page">
      <Header onBack={() => setView('dashboard')} onLanding={() => setView('landing')} action={view === 'clients' ? () => { setSelectedClient(null); setClientFormOpen(true) } : () => edit()} actionLabel={view === 'clients' ? 'Novo cliente' : 'Criar novo orçamento'} />
      <WorkspaceNav active={view} onNavigate={setView} />
      <div key={view} className="workspace-content">
        {(view === 'dashboard' || view === 'proposals') && <Dashboard section={view === 'proposals' ? 'proposals' : 'home'} budgets={budgets} clients={clients} profile={profile} onNew={() => edit()} onEdit={edit} onOpen={openProposal} onDelete={deleteBudget} onProfile={() => setView('profile')} />}
        {view === 'clients' && <ClientsView clients={clients} budgets={budgets} onOpen={openClient} onSave={saveClient} onDelete={deleteClient} onNew={() => { setSelectedClient(null); setClientFormOpen(true) }} />}
        {view === 'profile' && <><Profile profile={profile} setProfile={setProfile} /><details className="optional-fields profile-extra"><summary>Dados comerciais e condições padrão</summary><ProfileBusinessFields profile={profile} setProfile={setProfile} /></details><BackupPanel profile={profile} budgets={budgets} clients={clients} onRestore={restoreBackup} /></>}
      </div>
    </main> : <>
      {view === 'landing' && <LandingPage onEnter={start} />}
      {view === 'theme-test' && <ThemePreview onEnter={start} />}
      {view === 'client-details' && selectedClient && <ClientDetails client={clients.find((item) => item.id === selectedClient.id) || selectedClient} budgets={budgets} onBack={() => setView('clients')} onOpenProposal={openProposal} onEditClient={(client) => { setSelectedClient(client); setClientFormOpen(true) }} onNewProposal={(client) => { setEditingBudget({ ...createEmptyBudget(profile), clientId: client.id, clientName: client.name || client.companyName }); setView('editor') }} />}
      {view === 'editor' && <BudgetEditor key={editingBudget?.id || 'new'} profile={profile} clients={clients} initialBudget={editingBudget} createBudget={() => createEmptyBudget(profile)} onBack={() => setView('dashboard')} onProfile={() => setView('profile')} onNewClient={() => { setSelectedClient(null); onNewClientFromEditor() }} onSave={saveBudget} />}
      {view === 'details' && selectedProposal && <ProposalDetails budget={budgets.find((item) => item.id === selectedProposal.id) || selectedProposal} profile={selectedProposal.profileSnapshot || profile} onBack={() => setView('dashboard')} onEdit={edit} onSave={(budget) => saveBudget(budget, 'details')} />}
    </>}
    {clientFormOpen && <ClientForm initial={selectedClient} onSave={saveClient} onClose={() => { setClientFormOpen(false); setSelectedClient(null) }} />}
    {view !== 'landing' && view !== 'theme-test' && <InstitutionalFooter />}
  </div>
}

function Header({ onBack, onLanding, action, actionLabel = 'Criar novo orçamento' }) { return <header className="topbar"><button className="brand" onClick={onBack}><Logo /><span>Vetra</span></button><div className="topbar-actions">{onLanding && <button className="landing-return" type="button" onClick={onLanding}>← Ver landing</button>}{action && <Button onClick={action}>{actionLabel} <span>＋</span></Button>}</div></header> }
function InstitutionalFooter() { return <footer className="institutional-footer"><p>Vetra · VisurePictures · Dados locais neste navegador. Exporte um backup no Perfil.</p></footer> }

function Dashboard({ section, budgets, clients, profile, onNew, onEdit, onOpen, onDelete, onProfile }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const filtered = budgets.filter((budget) => `${budget.projectName} ${budget.clientName} ${budget.proposalNumber}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'Todos' || budget.status === statusFilter))
  const total = budgets.reduce((sum, budget) => sum + calculateBudget(budget).sustainablePrice, 0)
  return <div>{section === 'home' && <><section className="dashboard-heading"><div><div className="eyebrow">SEU ESPAÇO DE TRABALHO</div><h1>Olá{profile.professionalName ? `, ${profile.professionalName}` : ''}.</h1><p>Acompanhe suas propostas e mantenha seu trabalho em movimento.</p></div><button className="profile-link" onClick={onProfile}>Perfil de precificação <span>↗</span></button></section>
    {!profile.costsConfirmed && <section className="onboarding-card glass-panel"><h2>Seu preço começa com seus dados.</h2><p>Você pode usar sua própria tarifa ou configurar os custos para receber uma referência personalizada.</p><button className="button" onClick={onProfile}>Configurar minha tarifa</button></section>}
    {budgets.length > 0 && <section className="summary-grid compact-summary"><Summary label="Propostas" value={budgets.length} detail="registros salvos" /><Summary label="Valor proposto" value={formatCurrency(total)} detail="inclui rascunhos; não é receita recebida" /><Summary label="Clientes" value={clients.length} detail="cadastros neste navegador" /></section>}</>}
    <div className="section-title"><h2>{section === 'proposals' ? 'Todas as propostas' : 'Orçamentos recentes'}</h2><div className="dashboard-filters"><label className="search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Buscar propostas" placeholder="Buscar projeto, cliente ou número" /></label><select aria-label="Filtrar propostas por estado" className="status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>Todos</option><option>Rascunho</option><option>Orçamento enviado</option><option>Orçamento aprovado</option><option>Contrato aguardando assinatura</option><option>Contrato assinado</option><option>Em produção</option><option>Entregue</option><option>Concluído</option><option>Cancelado</option></select></div></div>
    {filtered.length ? <div className="budget-list">{filtered.map((budget) => <BudgetRow key={budget.id} budget={budget} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />)}</div> : <EmptyState onNew={onNew} hasSearch={Boolean(search || statusFilter !== 'Todos')} />}
  </div>
}
function Summary({ label, value, detail }) { return <GlassCard className="summary-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></GlassCard> }
function EmptyState({ onNew, hasSearch }) { return <div className="empty-state"><div className="empty-icon">✦</div><h3>{hasSearch ? 'Nenhum orçamento encontrado' : 'Seu próximo orçamento começa aqui'}</h3><p>{hasSearch ? 'Tente buscar por outro termo.' : 'Crie uma proposta com clareza e descubra o valor real do seu trabalho.'}</p>{!hasSearch && <Button onClick={onNew}>Criar primeiro orçamento <span>↗</span></Button>}</div> }
function BudgetRow({ budget, onOpen, onEdit, onDelete }) { const result = calculateBudget(budget); return <article className="budget-row"><div className="budget-icon">{budget.category === 'vídeo' ? '▶' : budget.category === 'foto e vídeo' ? '◈' : '◉'}</div><div className="budget-info"><span className="proposal-number">{budget.proposalNumber}</span><h3>{budget.projectName || 'Projeto sem nome'}</h3><p>{budget.clientName || 'Cliente não informado'} <span>·</span> {budget.category} <span>·</span> {formatDate(budget.startAt)}</p></div><strong className="budget-value">{formatCurrency(result.sustainablePrice)}</strong><span className="status-chip">{budget.status}</span><div className="row-actions"><button onClick={() => onOpen(budget)}>Abrir</button><button onClick={() => onEdit(budget)}>Editar</button><button onClick={() => onDelete(budget.id)}>Excluir</button></div></article> }

function WorkspaceNav({ active, onNavigate }) {
  const sections = [['dashboard', 'Início'], ['proposals', 'Propostas'], ['clients', 'Clientes'], ['profile', 'Perfil']]
  return <nav className="main-nav workspace-nav" aria-label="Navegação principal">
    {sections.map(([id, label]) => <button key={id} type="button" className={active === id ? 'is-active' : ''} aria-current={active === id ? 'page' : undefined} onClick={() => onNavigate(id)}>{label}<span className="nav-indicator" /></button>)}
  </nav>
}
function Profile({ profile, setProfile }) {
  const update = (key, value) => setProfile((current) => ({ ...current, [key]: ['professionalName', 'area'].includes(key) ? value : value === '' ? '' : sanitizeNumber(value), ...(key === 'professionalName' || key === 'area' || key === 'manualRate' ? {} : { costsConfirmed: false }) }))
  const rate = getHourlyCost(profile)
  const valid = rate > 0 && Number(profile.taxes) + Number(profile.fees) + Number(profile.profitMargin) < 100
  return <div><section className="subpage-heading"><div className="eyebrow">SUA BASE DE VALOR</div><h1>Minha tarifa</h1><p>Defina uma tarifa própria ou encontre uma referência a partir dos seus custos.</p></section>
    <section className="glass-panel form-panel"><div className="input-grid"><Field label="Nome profissional" value={profile.professionalName} onChange={(value) => update('professionalName', value)} /><Field label="Área de atuação" type="select" value={profile.area} onChange={(value) => update('area', value)} options={['fotografia','vídeo','ambos']} /><Field label="Minha tarifa de venda por hora" type="number" prefix="R$" value={profile.manualRate} onChange={(value)=>update('manualRate',value)} /></div><p className="form-help">Já sabe quanto cobra? Essa tarifa inclui o que você decidiu cobrar do cliente. A Vetra não acrescentará margem novamente.</p></section>
    <section className="glass-panel form-panel"><h2>Calcular com meus custos</h2><p className="form-help">Use seus valores mensais. Inclua a remuneração aqui uma única vez. Horas faturáveis são as horas de projetos que você consegue vender, incluindo preparação e edição.</p><div className="input-grid">{[['Meta de remuneração mensal','monthlyGoal','R$'],['Custos fixos mensais (sem as reservas abaixo)','monthlyCosts','R$'],['Reserva mensal para equipamentos','equipmentReserve','R$'],['Reserva mensal para férias e segurança','vacationReserve','R$'],['Horas faturáveis por mês','billableHours',''],['Margem de lucro desejada (%)','profitMargin','']].map(([label,key,prefix])=><Field key={key} label={label} prefix={prefix} type="number" value={profile[key]} onChange={(value)=>update(key,value)} />)}</div>
    <details className="optional-fields"><summary>Ajustes opcionais · impostos e taxas ({Number(profile.taxes) + Number(profile.fees)}%)</summary><div className="input-grid"><Field label="Impostos sobre a venda (%)" type="number" value={profile.taxes} onChange={value=>update("taxes",value)} /><Field label="Comissões e taxas (%)" type="number" value={profile.fees} onChange={value=>update("fees",value)} /></div><p className="form-help"><strong>O que são os impostos?</strong> É o percentual do valor faturado que você destina a tributos sobre este serviço. A Vetra não identifica seu regime tributário nem calcula obrigações fiscais. Informe o percentual aplicável com orientação do seu contador; não copie os 6% do exemplo. Tributos fixos mensais já incluídos nos custos não devem ser somados novamente aqui. O valor inicial 0% significa apenas que nada foi informado, não que você seja isento.</p></details><div className="personal-rate"><div><span>Custo interno por hora</span><strong>{formatCurrency(rate)}</strong></div><div><span>Referência de venda por hora</span><strong>{valid ? formatCurrency(rate / (1 - (Number(profile.taxes)+Number(profile.fees)+Number(profile.profitMargin))/100)) : 'Complete os dados'}</strong></div></div>
    <p className="form-help">É uma referência baseada nos seus dados, não uma pesquisa de preços do mercado. Não repita a reserva de equipamentos nos custos fixos.</p><button className="button" disabled={!valid} onClick={()=>setProfile(current=>({...current,costsConfirmed:true}))}>{profile.costsConfirmed ? 'Custos confirmados ✓' : 'Confirmar meus custos'}</button>{!valid && <p className="form-help">Informe uma necessidade mensal e horas maiores que zero. Impostos, taxas e margem devem somar menos de 100%.</p>}</section></div>
}

function ProfileBusinessFields({ profile, setProfile }) {
  const update = (key, value) => setProfile((current) => ({ ...current, [key]: value }))
  return <section className="profile-business-panel glass-panel form-panel"><div className="eyebrow">IDENTIDADE PROFISSIONAL</div><h2>Dados comerciais e padrões</h2><p className="panel-description">Esses dados aparecem automaticamente nas próximas propostas. Campos legais podem ficar em branco.</p><div className="input-grid"><Field label="Nome completo" value={profile.fullName} onChange={(value) => update('fullName', value)} /><Field label="Nome comercial" value={profile.commercialName} onChange={(value) => update('commercialName', value)} /><Field label="CPF ou CNPJ" value={profile.cpfCnpj} onChange={(value) => update('cpfCnpj', value)} /><Field label="Telefone" value={profile.phone} onChange={(value) => update('phone', value)} /><Field label="E-mail" value={profile.email} onChange={(value) => update('email', value)} /><Field label="Endereço" value={profile.address} onChange={(value) => update('address', value)} /><Field label="Instagram" value={profile.instagram} onChange={(value) => update('instagram', value)} /><Field label="Site" value={profile.site} onChange={(value) => update('site', value)} /><Field label="Chave Pix" value={profile.pixKey} onChange={(value) => update('pixKey', value)} /><Field label="Forma de pagamento padrão" value={profile.defaultPaymentMethod} onChange={(value) => update('defaultPaymentMethod', value)} /><Field label="Prazo de entrega padrão" value={profile.defaultDeliveryDeadline} onChange={(value) => update('defaultDeliveryDeadline', value)} /><Field label="Validade padrão" type="number" value={profile.defaultValidityDays} onChange={(value) => update('defaultValidityDays', value)} /><Field label="Reserva padrão" type="number" suffix="%" value={profile.defaultDepositPercentage} onChange={(value) => update('defaultDepositPercentage', value)} /><Field label="Revisões padrão" type="number" value={profile.defaultRevisions} onChange={(value) => update('defaultRevisions', value)} /><Field label="Armazenamento padrão" value={profile.defaultStorageTime} onChange={(value) => update('defaultStorageTime', value)} /></div><Field label="Política padrão de cancelamento" value={profile.defaultCancellationPolicy} onChange={(value) => update('defaultCancellationPolicy', value)} /><Field label="Política padrão de reagendamento" value={profile.defaultReschedulingPolicy} onChange={(value) => update('defaultReschedulingPolicy', value)} /></section>
}

function Field({ label, value, onChange, type = 'text', prefix, suffix, placeholder, options }) { return <label className="field"><span>{label}</span><div className="input-wrap">{prefix && <i>{prefix}</i>}{type === 'select' ? <select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option[0].toUpperCase() + option.slice(1)}</option>)}</select> : type === 'number' ? <NumericInput value={value} onChange={onChange} placeholder={placeholder} min="0" /> : <input type={type} value={value} placeholder={placeholder} min="0" onChange={(event) => onChange(event.target.value)} />}{suffix && <i>{suffix}</i>}</div></label> }


function formatDate(value) { if (!value) return 'Data não definida'; try { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) } catch { return 'Data não definida' } }
