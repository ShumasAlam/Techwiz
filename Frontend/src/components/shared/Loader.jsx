import { Leaf } from 'lucide-react'

export default function Loader({ done = false }) {
  return (
    <div className={`loader-screen ${done ? 'is-done' : ''}`} aria-hidden={done}>
      <div className="loader-mark">
        <div className="loader-orbit"><Leaf /><i /><i /><i /></div>
        <div className="loader-shadow" />
      </div>
      <strong className="loader-brand">MarketLink</strong>
      <span className="loader-copy">Gathering today’s harvest…</span>
      <div className="loader-progress"><span /></div>
    </div>
  )
}
