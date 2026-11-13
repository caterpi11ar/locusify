// Development-only fixture: real replay UI with no photos, map requests or recording.
import { domAnimation, LazyMotion } from 'motion/react'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { i18n } from '../../src/i18n'
import { TrajectoryOverlay } from '../../src/pages/map/components/TrajectoryOverlay'
import { useReplayStore } from '../../src/stores/replayStore'
import '../../src/index.css'

await i18n.changeLanguage(new URLSearchParams(location.search).get('lang') ?? 'zh-CN')
useReplayStore.setState({ status: 'configuring', isReplayMode: true })

function Fixture() {
  const [visible, setVisible] = useState(true)
  return (
    <LazyMotion features={domAnimation}>
      <div className="relative h-dvh bg-neutral-200">
        <button
          type="button"
          className="relative z-50"
          onClick={() => {
            useReplayStore.setState({ status: 'configuring' })
            setVisible(value => !value)
          }}
        >
          Toggle replay screen
        </button>
        {visible && <TrajectoryOverlay presentationActive={false} />}
      </div>
    </LazyMotion>
  )
}

createRoot(document.getElementById('root')!).render(<Fixture />)
