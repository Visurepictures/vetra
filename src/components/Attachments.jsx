import { useRef, useState } from 'react'

export default function Attachments({ budget, onSave }) {
  const input = useRef(null)
  const [message, setMessage] = useState('')
  const files = budget.documents || []
  const add = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file) return
    if (!['application/pdf', 'image/png', 'image/jpeg', 'text/plain'].includes(file.type)) { setMessage('Use PDF, PNG, JPG ou TXT.'); return }
    if (file.size > 500 * 1024 || files.reduce((sum, item) => sum + (item.size || 0), 0) + file.size > 1500 * 1024) { setMessage('Limite: 500 KB por arquivo e 1,5 MB por proposta.'); return }
    try {
      const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file) })
      if (onSave({ ...budget, documents: [...files, { id: crypto.randomUUID(), name: file.name, type: file.type, size: file.size, data }] }) === false) { setMessage('Não foi possível salvar o anexo. Exporte um backup e confira o espaço disponível.'); return }
      setMessage('Arquivo anexado. Incluído no backup da Vetra.')
    } catch { setMessage('Não foi possível ler o arquivo.') }
  }
  return <section className="glass-panel form-panel"><h2>Arquivos e comprovantes</h2><p>PDF, JPG, PNG ou TXT · até 500 KB por arquivo. Armazenados somente neste navegador.</p><input hidden ref={input} type="file" accept="application/pdf,image/png,image/jpeg,text/plain" onChange={add} /><button className="button button-secondary" onClick={() => input.current.click()}>Adicionar arquivo</button>{message && <p role="status">{message}</p>}<ul className="attachment-list">{files.map((file) => <li key={file.id}><span>{file.name || 'Arquivo'} <small>{Math.ceil((file.size || 0) / 1024)} KB</small></span>{/^data:(application\/pdf|image\/(png|jpeg)|text\/plain);base64,/.test(file.data || '') && <a className="text-button" href={file.data} download={file.name}>Baixar</a>}<button className="text-button" onClick={() => { if (window.confirm('Excluir este anexo?')) onSave({ ...budget, documents: files.filter((item) => item.id !== file.id) }) }}>Excluir</button></li>)}</ul></section>
}
