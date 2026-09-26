import { useEffect, useRef } from 'react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import Lenis from 'lenis'

const stages = [
  { number: '01', label: 'Planejamento' },
  { number: '02', label: 'Captação' },
  { number: '03', label: 'Edição' },
  { number: '04', label: 'Entrega' },
]

const storyLines = ['Você fotografa.', 'Você grava.', 'Você edita.', 'Você entrega.']

const documents = [
  { icon: '✦', label: 'Orçamento', detail: 'Clareza desde o primeiro contato.' },
  { icon: '◌', label: 'Contrato', detail: 'Acordos que protegem o trabalho.' },
  { icon: '□', label: 'Autorizações', detail: 'Tudo registrado em um só lugar.' },
  { icon: '↗', label: 'Documentos', detail: 'Uma entrega mais profissional.' },
]

export default function LandingPage({ onEnter }) {
  const pageRef = useRef(null)
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: pageRef, offset: ['start start', 'end end'] })
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 28, restDelta: 0.001 })
  const heroScale = useTransform(progress, [0, 0.12], [1, 0.96])
  const heroOpacity = useTransform(progress, [0, 0.13], [1, 0.25])
  const heroBlur = useTransform(progress, [0, 0.13], ['blur(0px)', 'blur(8px)'])

  useEffect(() => {
    if (reduceMotion) return undefined
    const lenis = new Lenis({ autoRaf: true, lerp: 0.085, smoothWheel: true })
    return () => lenis.destroy()
  }, [reduceMotion])

  const scrollToPlatform = () => document.querySelector('#landing-platform')?.scrollIntoView({ behavior: 'smooth' })

  return <main className="landing-page" id="landing-top" ref={pageRef}>
    <section className="landing-hero">
      <div className="landing-nav">
        <a className="landing-brand" href="#landing-top" aria-label="Vetra, início"><span className="landing-logo">V</span><span>Vetra</span></a>
        <button className="landing-nav-action" onClick={onEnter}>Entrar na Vetra <span>↗</span></button>
      </div>
      <motion.div className="landing-hero-content" style={reduceMotion ? undefined : { scale: heroScale, opacity: heroOpacity, filter: heroBlur }} initial={reduceMotion ? false : { opacity: 0, y: 28, scale: .98 }} animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }} transition={{ duration: 1.1, ease: [.2, .7, .2, 1] }}>
        <span className="landing-overline">GESTÃO PARA QUEM CRIA</span>
        <h1>Vetra<br /><em>Clareza para cobrar.<br />Estrutura para crescer.</em></h1>
        <p>Gestão, precificação e propostas para profissionais de imagem.</p>
        <div className="landing-actions"><button className="landing-button landing-button-primary" onClick={onEnter}>Entrar na Vetra <span>↗</span></button><button className="landing-button landing-button-quiet" onClick={scrollToPlatform}>Conhecer a plataforma <span>↓</span></button></div>
      </motion.div>
      <a className="landing-scroll" href="#landing-platform"><span>ROLE PARA EXPLORAR</span><i /></a>
      <div className="landing-orbit landing-orbit-one" aria-hidden="true" /><div className="landing-orbit landing-orbit-two" aria-hidden="true" />
    </section>

    <section className="landing-story-section" id="landing-platform"><div className="landing-story-sticky"><span className="landing-overline">O VALOR DO SEU TRABALHO</span>{storyLines.map((line, index) => <motion.h2 key={line} initial={{ opacity: 0, y: 34, filter: 'blur(10px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, amount: .7 }} transition={{ delay: index * .08, duration: .7 }}>{line}</motion.h2>)}<motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: .45, duration: .8 }}>Mas quanto realmente custa tudo isso?</motion.p></div></section>

    <section className="landing-section landing-stages-section"><div className="landing-section-intro"><span className="landing-overline">DO PRIMEIRO PASSO À ENTREGA</span><h2>Tudo conta.</h2></div><div className="landing-stages">{stages.map((stage, index) => <motion.article className="landing-stage" key={stage.number} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .35 }} transition={{ delay: index * .1, duration: .7 }}><span>{stage.number}</span><strong>{stage.label}</strong><i /></motion.article>)}</div></section>

    <section className="landing-section landing-value-section"><div className="landing-value-copy"><span className="landing-overline">UMA BASE MAIS JUSTA</span><h2>Pare de adivinhar<br />quanto cobrar.</h2><p>Calcule com clareza.</p><div className="landing-value-note"><i>✦</i><span>Um preço que sustenta o seu trabalho.</span></div></div><motion.div className="landing-value-visual" initial={{ opacity: 0, scale: .96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, amount: .4 }} transition={{ duration: .9 }}><div className="landing-value intuitive"><span>Valor intuitivo <b>sem contexto</b></span><strong>R$ 500</strong><small>parece simples, mas deixa custos para trás</small></div><div className="landing-value-connector">+ clareza</div><div className="landing-value sustainable"><span>Valor sustentável <b>completo</b></span><strong>R$ 1.351,35</strong><small>custos, tempo e margem incluídos</small></div></motion.div></section>

    <section className="landing-section landing-flow-section"><div className="landing-section-intro"><span className="landing-overline">UM FLUXO MAIS CLARO</span><h2>Todo projeto<br /><em>em um só lugar.</em></h2></div><motion.div className="landing-flow" initial={{ opacity: 0, scale: .92 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, amount: .35 }} transition={{ duration: .9 }}>{['Cliente', 'Proposta', 'Contrato', 'Entrega', 'Concluído'].map((item, index) => <div className="landing-flow-item" key={item}><span>{item}</span>{index < 4 && <i>↓</i>}</div>)}</motion.div></section>

    <section className="landing-section landing-documents-section"><div className="landing-section-intro"><span className="landing-overline">UMA PRESENÇA PROFISSIONAL</span><h2>Profissional<br />do início ao fim.</h2><p>Profissional em cada detalhe que o cliente vê.</p></div><div className="landing-documents">{documents.map((document, index) => <motion.article className="landing-document" key={document.label} initial={{ opacity: 0, y: 28, rotate: index % 2 ? 1 : -1 }} whileInView={{ opacity: 1, y: 0, rotate: 0 }} viewport={{ once: true, amount: .25 }} transition={{ delay: index * .1, duration: .75 }}><span className="landing-document-icon">{document.icon}</span><strong>{document.label}</strong><p>{document.detail}</p></motion.article>)}</div></section>

    <section className="landing-section landing-privacy-section"><div className="landing-privacy-icon" aria-hidden="true">🔒</div><div><span className="landing-overline">SEMPRE SOB SEU CONTROLE</span><h2>Privacidade em primeiro lugar</h2><p>Os dados da Vetra permanecem no seu dispositivo e não são enviados para servidores externos nesta versão.</p><p>Orçamentos, clientes e configurações são armazenados localmente no seu navegador. A Vetra não compartilha suas informações com terceiros.</p><p>Seus dados permanecem sob seu controle.</p></div></section>

    <motion.section className="landing-final" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: .35 }} transition={{ duration: .8 }}><div className="landing-final-orb landing-final-orb-one" /><div className="landing-final-orb landing-final-orb-two" /><motion.span className="landing-overline" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: .15, duration: .6 }}>A PRÓXIMA ETAPA É SUA</motion.span><motion.h2 initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: .25, duration: .8 }}>Você cria.<br /><em>A Vetra ajuda a calcular,<br />organizar e apresentar<br />o valor do seu trabalho.</em></motion.h2><motion.button className="landing-button landing-button-primary landing-final-button" onClick={onEnter} whileHover={{ y: -5, scale: 1.03 }} whileTap={{ scale: .98 }} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: .42, duration: .65 }}>Entrar na Vetra <span>↗</span></motion.button><span className="landing-final-hint">Seu próximo passo começa aqui <i>↓</i></span></motion.section>

    <footer className="landing-footer"><div className="landing-footer-brand"><span className="landing-logo">V</span><strong>Vetra</strong><p>Clareza para cobrar.<br />Estrutura para crescer.</p></div><div className="landing-footer-links"><span>GESTÃO PARA QUEM CRIA</span><p>Orçamentos · Clientes · Documentos</p><p>Dados armazenados no seu dispositivo.</p></div><div className="landing-footer-meta"><span>DESENVOLVIDA POR</span><strong>VisurePictures</strong><small>© 2026. Todos os direitos reservados.</small></div></footer>
  </main>
}
