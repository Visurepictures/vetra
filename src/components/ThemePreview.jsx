import { motion } from 'framer-motion'

export default function ThemePreview({ onEnter }) {
  return <main className="theme-preview-page">
    <div className="theme-preview-orb theme-preview-orb-one" aria-hidden="true" />
    <div className="theme-preview-orb theme-preview-orb-two" aria-hidden="true" />
    <header className="theme-preview-header">
      <div className="theme-preview-brand"><span>V</span><strong>Vetra</strong><small>Dark Liquid Glass</small></div>
      <button className="theme-preview-close" onClick={onEnter}>Entrar no workspace <span>↗</span></button>
    </header>
    <section className="theme-preview-hero">
      <span className="theme-preview-kicker">TESTE DE DIREÇÃO VISUAL</span>
      <h1>Profundidade<br /><em>sem perder clareza.</em></h1>
      <p>Uma amostra do futuro tema escuro da Vetra, inspirado no Liquid Glass do iOS.</p>
    </section>
    <section className="theme-preview-grid" aria-label="Amostra de componentes">
      <motion.article className="theme-glass-card theme-glass-card-large" whileHover={{ y: -6 }} transition={{ duration: .3 }}>
        <div className="theme-card-top"><span className="theme-icon">✦</span><span className="theme-status">AO VIVO</span></div>
        <span className="theme-label">VALOR SUSTENTÁVEL</span>
        <strong className="theme-price">R$ 1.351,35</strong>
        <div className="theme-meter"><i /></div>
        <small>Base calculada com custos, impostos e margem.</small>
      </motion.article>
      <motion.article className="theme-glass-card" whileHover={{ y: -6 }} transition={{ duration: .3 }}>
        <span className="theme-label">PRÓXIMA PROPOSTA</span>
        <h2>Ensaio de inverno</h2>
        <p>Marina Costa · Fotografia</p>
        <div className="theme-chip">Rascunho</div>
        <button className="theme-action">Abrir proposta <span>↗</span></button>
      </motion.article>
      <motion.article className="theme-glass-card theme-glass-card-wide" whileHover={{ y: -6 }} transition={{ duration: .3 }}>
        <div><span className="theme-label">PALETA DE TESTE</span><h2>Azul noturno · Violeta · Prata</h2></div>
        <div className="theme-swatches" aria-label="Cores da paleta"><i /><i /><i /><i /><i /></div>
      </motion.article>
    </section>
  </main>
}
