import { useEffect, useRef, useState } from 'react'
import { aiContext, validateSuggestion } from '../utils/aiSuggestions'
import { formatCurrency } from '../utils/calculations'

export default function BudgetAI({ budget, profile, onApply }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('off')
  const [progress, setProgress] = useState(0)
  const [brief, setBrief] = useState('')
  const [suggestion, setSuggestion] = useState(null)
  const [selected, setSelected] = useState([])
  const [rate, setRate] = useState(0)
  const [message, setMessage] = useState('')
  const worker = useRef(null), timer = useRef(null)
  const [snapshot, setSnapshot] = useState('')
  const busy = status === 'loading' || status === 'generating'
  const currentContext = JSON.stringify(aiContext(budget, profile, brief || budget.notes || ''))
  const stale = suggestion && snapshot !== currentContext
  function stop(messageText = 'IA desligada. Seus dados e o orçamento continuam disponíveis.') {
    worker.current?.terminate(); worker.current = null; clearTimeout(timer.current)
    setStatus('off'); setMessage(messageText)
  }
  useEffect(() => () => { worker.current?.terminate(); clearTimeout(timer.current) }, [])
  const armTimeout = (ms, idle = false) => { clearTimeout(timer.current); timer.current = setTimeout(() => stop(idle ? 'IA desligada para economizar energia. Ative novamente quando precisar.' : 'O processamento demorou demais e foi interrompido. Você pode tentar novamente ou continuar sem IA.'), ms) }
  const activate = () => {
    if (!navigator.gpu) { setStatus('unsupported'); setMessage('Este navegador não oferece WebGPU. Use um navegador e dispositivo compatíveis ou continue com a revisão local.'); return }
    setMessage(''); setStatus('loading'); setProgress(0)
    try {
      const currentWorker = new Worker(new URL('../workers/budgetAI.js', import.meta.url), { type: 'module' })
      worker.current = currentWorker
      currentWorker.onmessage = ({ data }) => {
        if (worker.current !== currentWorker) return
        if (data.type === 'progress') setProgress(Math.round(data.progress * 100))
        if (data.type === 'ready') { clearTimeout(timer.current); setStatus('ready'); setMessage('IA pronta neste dispositivo. Descreva o projeto para gerar sugestões.'); armTimeout(180000, true) }
        if (data.type === 'result') {
          try { const safe = validateSuggestion(data.suggestion); setSuggestion(safe); setSelected(safe.activities.map(() => false)); setStatus('ready'); setMessage('Sugestões geradas. Confira as estimativas; nenhuma alteração foi aplicada.'); armTimeout(180000, true) }
          catch { stop('A IA retornou uma sugestão inválida. Nada foi alterado; tente novamente.') }
        }
        if (data.type === 'error') stop(data.code === 'unsupported' ? 'Não foi possível acessar a aceleração gráfica neste navegador. Continue com a revisão local.' : data.code === 'load' ? 'Não foi possível carregar o modelo. Confira a conexão e a memória disponível e tente novamente.' : 'Não foi possível concluir uma sugestão válida. Nada foi alterado; tente novamente.')
      }
      currentWorker.onerror = () => { if (worker.current === currentWorker) stop('A IA foi interrompida pelo navegador. Nada foi alterado; você pode continuar sem IA.') }
      armTimeout(600000); currentWorker.postMessage({ type: 'load' })
    } catch { stop('Não foi possível iniciar a IA neste navegador. Continue com a revisão local.') }
  }
  const generate = () => {
    const description = brief || budget.notes || ''
    if (description.trim().length < 15) { setMessage('Descreva o projeto com pelo menos 15 caracteres.'); return }
    setSuggestion(null); setMessage(''); setStatus('generating'); setSnapshot(currentContext)
    const rates = budget.activities.map(item => Number(item.unitValue)).filter(Number.isFinite)
    setRate(rates.length && rates.every(value => value === rates[0]) ? rates[0] : 0)
    armTimeout(120000); worker.current.postMessage({ type: 'generate', context: JSON.parse(currentContext) })
  }
  const apply = () => {
    if (stale) return
    const rows = suggestion.activities.filter((_, index) => selected[index])
    if (!rows.length || !Number.isFinite(Number(rate)) || Number(rate) < 0) return
    onApply(rows, Number(rate)); setSuggestion(null); setMessage('Atividades adicionadas. Revise horas e valores no passo Tempo e gastos.');
  }
  return <section className="budget-ai" aria-label="Assistente de inteligência artificial">
    <button className="ai-toggle" aria-expanded={open} onClick={() => { if (open) stop(); setOpen(!open) }}><span>✦ Assistente de orçamento</span><span>IA local · opcional {open ? '−' : '+'}</span></button>
    {open && <div className="ai-body"><h2>Descreva o trabalho. Revise as sugestões.</h2><p>IA gratuita, sem assinatura ou chave. Processa o projeto neste dispositivo; não envia o conteúdo a um serviço de IA.</p><p className="form-help">Ao ativar, baixa um modelo de cerca de 1 GB dos servidores Hugging Face/MLC e pode precisar de cerca de 2 GB de memória, além de usar bateria. Requer WebGPU; pode não funcionar em todos os aparelhos. O download pode ficar no cache do navegador. Desliga ao sair do editor ou após 3 minutos sem gerar sugestões.</p>
      {status !== 'ready' && !busy && <button className="button" onClick={activate}>Ativar IA e baixar modelo</button>}
      {busy && <div role="status"><p>{status === 'loading' ? `Preparando a IA · ${progress}%` : 'Criando sugestões para seu projeto…'}</p>{status === 'loading' && <progress max="100" value={progress} aria-label="Preparação da IA" />}</div>}
      {(busy || status === 'ready') && <button className="text-button" onClick={() => stop()}>{busy ? 'Cancelar e desligar IA' : 'Desligar IA para economizar energia'}</button>}
      <label className="field"><span>O que você precisa realizar?</span><textarea maxLength="1500" value={brief} disabled={busy} onChange={event => setBrief(event.target.value)} placeholder="Ex.: vídeo de 1 minuto para uma cafeteria, 2 horas de gravação, edição e uma revisão. Se deixar vazio, uso a descrição do projeto." /></label>
      <button className="button button-secondary" disabled={status !== 'ready'} onClick={generate}>Gerar sugestões com IA</button>
      {message && <p role="status" className="form-help">{message}</p>}
      {suggestion && <div className="ai-result"><h3>Sugestão para revisar</h3><p className="form-help">Sugestões geradas pelo modelo. Não são fatos confirmados sobre o projeto.</p><p className="form-help">O modelo pode errar. As horas começam em 0 para você informar seu tempo real. Escolha somente atividades que ainda faltam.</p>
        {suggestion.activities.map((item, index) => <div className="ai-activity" key={index}><label><input type="checkbox" checked={selected[index] || false} onChange={event => setSelected(current => current.map((value,i) => i === index ? event.target.checked : value))} />{item.name}</label><label className="field"><span>Horas a preencher · {item.name}</span><input type="number" min="0" max="200" step="0.25" value={item.hours} onChange={event => { const hours = Number(event.target.value); if (Number.isFinite(hours) && hours >= 0 && hours <= 200) setSuggestion(current => ({ ...current, activities: current.activities.map((row,i) => i === index ? { ...row, hours } : row) })) }} /></label></div>)}
        {!!suggestion.activities.length && <label className="field"><span>{budget.priceMode === 'rate' ? 'Tarifa de venda' : 'Custo interno'} por hora para as atividades selecionadas (R$)</span><input type="number" min="0" step="any" value={rate} onChange={event=>setRate(event.target.value)} /></label>}
        {!!suggestion.questions.length && <><h3>Antes de fechar o escopo</h3><ul>{suggestion.questions.map((line,i)=><li key={i}>{line}</li>)}</ul></>}
        {!!suggestion.observations.length && <><h3>Pontos para conferir</h3><ul>{suggestion.observations.map((line,i)=><li key={i}>{line}</li>)}</ul></>}
        {stale && <p role="alert">O projeto mudou. Gere novas sugestões antes de aplicar.</p>}
        {!!suggestion.activities.length && <><p className="form-help">Valor unitário escolhido por você: {formatCurrency(Number(rate))}. A IA não altera impostos, margem, cliente ou documentos. As atividades selecionadas serão adicionadas às existentes.</p><button className="button" disabled={stale || !selected.some(Boolean) || !Number.isFinite(Number(rate)) || Number(rate)<0} onClick={apply}>Adicionar atividades selecionadas</button></>}
      </div>}
      <small>Qwen 2.5 1.5B · WebLLM. A verificação por regras continua disponível no passo Revisão.</small>
    </div>}
  </section>
}
