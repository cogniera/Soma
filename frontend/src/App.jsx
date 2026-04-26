import { useState, useCallback } from 'react'
import './App.css'

import Intro      from './screens/Intro/Intro'
import Landing    from './screens/Landing/Landing'
import SymptomInput from './screens/SymptomInput/SymptomInput'
import QnA        from './screens/QnA/QnA'
import Triage     from './screens/Triage/Triage'
import BodyMap    from './screens/BodyMap/BodyMap'
import Anatomy    from './screens/Anatomy/Anatomy'
import OsoCorner  from './components/OsoCorner/OsoCorner'
import Explore     from './screens/Explore/Explore'

// Phase flow: intro → landing → symptom → qna → triage → bodymap → anatomy
// On refresh: skip intro, start at landing (sessionStorage flag)

const VISITED_KEY = 'soma-visited'

const INITIAL_SESSION = {
  symptomText:  '',
  conversation: [],
  triage:       null,
  bodyRegion:   null,
}

export default function App() {
  const alreadyVisited = !!sessionStorage.getItem(VISITED_KEY)

  const [phase, setPhase]     = useState(alreadyVisited ? 'landing' : 'intro')
  const [session, setSession] = useState(INITIAL_SESSION)
  const [osoMood, setOsoMood] = useState('idle')
  const [mascotReady, setMascotReady] = useState(alreadyVisited)

  const merge = (patch) => setSession(prev => ({ ...prev, ...patch }))

  const restart = useCallback(() => {
    setSession(INITIAL_SESSION)
    setPhase('landing')
    setOsoMood('idle')
  }, [])

  // ── Transition handlers ──────────────────────────────────────
  const onIntroDone = useCallback(() => {
    sessionStorage.setItem(VISITED_KEY, '1')
    setMascotReady(true)
    setPhase('landing')
  }, [])

  const onLandingChat    = useCallback(() => setPhase('symptom'), [])
  const onLandingExplore = useCallback(() => setPhase('visual'), [])
  const onLandingVisual  = useCallback(() => setPhase('visual'), [])

  const onSymptomSubmit = useCallback((symptomText) => {
    merge({ symptomText })
    setPhase('qna')
  }, [])

  const onSymptomVisual = useCallback(() => {
    setPhase('visual')
  }, [])

  const onQnAComplete = useCallback((conversation) => {
    merge({ conversation })
    setPhase('triage')
  }, [])

  const onTriageContinue = useCallback((triageResult) => {
    merge({ triage: triageResult, bodyRegion: triageResult.bodyRegion })
    setPhase('bodymap')
  }, [])

  const onRegionConfirm = useCallback((region) => {
    merge({ bodyRegion: region })
    setPhase('anatomy')
  }, [])

  const onAnatomyBack = useCallback(() => setPhase('bodymap'), [])

  // ── Render ───────────────────────────────────────────────────
  const showCorner = mascotReady && phase !== 'intro' && phase !== 'landing' && phase !== 'visual'

  return (
    <div className="soma-root">
      {/* Ambient background — always present */}
      <div className="bg-canvas" aria-hidden="true">
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="orb orb-c" />
        <div className="dot-grid" />
      </div>

      {phase === 'intro' && (
        <Intro onComplete={onIntroDone} />
      )}

      {phase === 'landing' && (
        <Landing onChat={onLandingChat} onExplore={onLandingExplore} />
      )}

      {phase === 'symptom' && (
        <div className="screen-wrap" key="symptom">
          <SymptomInput onSubmit={onSymptomSubmit} onVisual={onSymptomVisual} onBack={() => setPhase('landing')} />
        </div>
      )}

      {phase === 'qna' && (
        <div className="screen-wrap" key="qna">
          <QnA
            symptomText={session.symptomText}
            onComplete={onQnAComplete}
            onOsoMood={setOsoMood}
            onBack={() => setPhase('landing')}
          />
        </div>
      )}

      {phase === 'triage' && (
        <div className="screen-wrap" key="triage">
          <Triage
            conversation={session.conversation}
            symptomText={session.symptomText}
            onContinue={onTriageContinue}
            onOsoMood={setOsoMood}
          />
        </div>
      )}

      {phase === 'bodymap' && (
        <div className="screen-wrap screen-wrap--full" key="bodymap">
          <BodyMap
            aiRegion={session.triage?.bodyRegion ?? session.bodyRegion}
            onConfirm={onRegionConfirm}
            onOsoMood={setOsoMood}
          />
        </div>
      )}

      {phase === 'visual' && (
        <div className="screen-wrap screen-wrap--full" key="visual">
          <Explore onBack={() => setPhase('landing')} />
        </div>
      )}

      {phase === 'anatomy' && (
        <div className="screen-wrap screen-wrap--full" key="anatomy">
          <Anatomy
            bodyRegion={session.bodyRegion}
            symptomSummary={session.triage?.summary ?? session.symptomText}
            onBack={onAnatomyBack}
            onRestart={restart}
            onOsoMood={setOsoMood}
          />
        </div>
      )}

      {showCorner && (
        <OsoCorner mood={osoMood} />
      )}
    </div>
  )
}
