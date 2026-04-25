import { useState, useCallback } from 'react'
import './App.css'

import Intro         from './screens/Intro/Intro'
import SymptomInput  from './screens/SymptomInput/SymptomInput'
import QnA           from './screens/QnA/QnA'
import Triage        from './screens/Triage/Triage'
import BodyMap       from './screens/BodyMap/BodyMap'
import Anatomy       from './screens/Anatomy/Anatomy'
import Emergency     from './screens/Emergency/Emergency'
import OsoCorner     from './components/OsoCorner/OsoCorner'

// Phase state machine:
// intro → symptom → qna → triage → bodymap → anatomy
//                                 ↘ emergency

const INITIAL_SESSION = {
  symptomText:  '',
  conversation: [],
  triage:       null,
  bodyRegion:   null,
}

export default function App() {
  const [phase, setPhase]         = useState('intro')
  const [session, setSession]     = useState(INITIAL_SESSION)
  const [osoMood, setOsoMood]     = useState('idle')
  const [mascotReady, setMascotReady] = useState(false)

  const merge = (patch) => setSession(prev => ({ ...prev, ...patch }))

  const restart = useCallback(() => {
    setSession(INITIAL_SESSION)
    setPhase('symptom')
    setOsoMood('idle')
  }, [])

  // ── Transition handlers ──────────────────────────────────────
  const onIntroDone = useCallback(() => {
    setMascotReady(true)
    setPhase('symptom')
  }, [])

  const onSymptomSubmit = useCallback((symptomText) => {
    merge({ symptomText })
    setPhase('qna')
  }, [])

  const onQnAComplete = useCallback((conversation) => {
    merge({ conversation })
    setPhase('triage')
  }, [])

  const onTriageContinue = useCallback((triageResult) => {
    merge({ triage: triageResult, bodyRegion: triageResult.bodyRegion })
    setPhase('bodymap')
  }, [])

  const onTriageEmergency = useCallback((triageResult) => {
    merge({ triage: triageResult })
    setPhase('emergency')
  }, [])

  const onRegionConfirm = useCallback((region) => {
    merge({ bodyRegion: region })
    setPhase('anatomy')
  }, [])

  const onAnatomyBack = useCallback(() => setPhase('bodymap'), [])

  // ── Render ───────────────────────────────────────────────────
  const showCorner = mascotReady && phase !== 'intro'

  return (
    <div className="soma-root">
      {/* Ambient background — always present */}
      <div className="bg-canvas" aria-hidden="true">
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="orb orb-c" />
        <div className="dot-grid" />
      </div>

      {/* Screens */}
      {phase === 'intro' && (
        <Intro onComplete={onIntroDone} />
      )}

      {phase === 'symptom' && (
        <div className="screen-wrap" key="symptom">
          <SymptomInput onSubmit={onSymptomSubmit} />
        </div>
      )}

      {phase === 'qna' && (
        <div className="screen-wrap" key="qna">
          <QnA
            symptomText={session.symptomText}
            onComplete={onQnAComplete}
            onOsoMood={setOsoMood}
          />
        </div>
      )}

      {phase === 'triage' && (
        <div className="screen-wrap" key="triage">
          <Triage
            conversation={session.conversation}
            symptomText={session.symptomText}
            onContinue={onTriageContinue}
            onEmergency={onTriageEmergency}
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

      {phase === 'emergency' && (
        <div className="screen-wrap" key="emergency">
          <Emergency
            triageResult={session.triage}
            onRestart={restart}
            onOsoMood={setOsoMood}
          />
        </div>
      )}

      {/* Persistent Oso corner — appears after intro */}
      {showCorner && (
        <OsoCorner mood={osoMood} />
      )}
    </div>
  )
}
