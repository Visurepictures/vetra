import { useRef, useState } from 'react'
import { downloadFile, validateBackup } from '../utils/storage'

export default function BackupPanel({ profile, budgets, clients, onRestore }) {
  const input = useRef(null)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(null)
  const exportData = () => {
    downloadFile(`Vetra-backup-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify({ app: 'Vetra', version: 1, exportedAt: new Date().toISOString(), profile, budgets, clients }, null, 2))
    setMessage('Backup exportado com perfil, propostas e clientes. Guarde em um local seguro.')
  }
  const importData = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('O arquivo excede 20 MB.')
      setPending(validateBackup(JSON.parse(await file.text())))
      setMessage('Revise os dados antes de restaurar. A restauração substitui os registros deste navegador.')
    } catch (error) { setMessage(error.message || 'Não foi possível ler o backup.'); setPending(null) }
  }
  return <section className="glass-panel form-panel backup-panel"><span className="card-kicker">SEUS DADOS</span><h2>Backup e transferência</h2><p>Leve suas propostas para outro navegador ou dispositivo. Os dados não são sincronizados automaticamente.</p><div className="backup-actions"><button className="button" onClick={exportData}>Exportar backup</button><button className="button button-secondary" onClick={() => input.current.click()}>Importar backup</button></div><input ref={input} hidden type="file" accept=".json,application/json" onChange={importData} />{message && <p role="status" className="notice">{message}</p>}{pending && <div className="notice"><p>{pending.budgets.length} propostas · {pending.clients.length} clientes</p><button className="button" onClick={() => { exportData(); if (onRestore(pending) === false) { setMessage('Não foi possível restaurar. Os dados atuais foram preservados.'); return } setPending(null); setMessage('Dados restaurados. Uma cópia dos dados anteriores também foi exportada.') }}>Exportar atuais e restaurar</button><button className="text-button" onClick={() => setPending(null)}>Cancelar</button></div>}</section>
}
