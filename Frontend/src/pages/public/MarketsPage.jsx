import { ArrowRight, Clock3, MapPin, Navigation } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'
import { marketDirectionsUrl, marketEmbedUrl } from '../../utils/maps'

const marketBadge = (market) => {
  if (!market?.date || market.date.toLowerCase() === 'weekly') return { top: market.day?.slice(0, 3) || 'Now', bottom: 'Weekly' }
  const [top, bottom = market.day?.slice(0, 3) || ''] = market.date.split(' ')
  return { top, bottom }
}

export default function MarketsPage() {
  const db = api.snapshot()
  const [active, setActive] = useState(db.markets[0])
  const [view, setView] = useState('list')

  return <main><section className="page-hero page-hero--map"><div className="shell"><p className="eyebrow eyebrow--gold">PICKUP POINTS</p><h1>Your local market, <em>mapped.</em></h1><p>Plan one good trip: see opening times, active growers and exact pickup points.</p></div></section><div className="shell filter-pills market-view-switch"><button className={view === 'list' ? 'is-active' : ''} onClick={() => setView('list')}>List View</button><button className={view === 'map' ? 'is-active' : ''} onClick={() => setView('map')}>Map View</button></div><section className={`markets-browser shell markets-browser--${view}`}><div className="market-browser-list"><div className="browser-head"><div><span>{db.markets.length} MARKETS NEARBY</span><h2>Pickup points</h2></div></div>{db.markets.map((market) => { const badge = marketBadge(market); return <button key={market.id} onClick={() => { setActive(market); setView('map') }} className={`market-browser-card ${active?.id === market.id ? 'is-active' : ''}`}><span className="market-date"><b>{badge.top}</b><small>{badge.bottom}</small></span><div><h3>{market.name}</h3><p><Clock3 /> {market.day} - {market.hours}</p><p><MapPin /> {market.address}</p><small>{market.stalls} stalls - {market.distance || 'nearby'}</small></div><ArrowRight /></button> })}</div>{view === 'map' && active && <div className="live-map"><iframe title="Market location" src={marketEmbedUrl(active)} loading="lazy" /><div className="map-card"><span><MapPin /></span><div><small>SELECTED PICKUP POINT</small><strong>{active.name}</strong><p>{active.address}</p></div><a className="icon-btn" aria-label="Directions to selected market" href={marketDirectionsUrl(active)} target="_blank" rel="noreferrer"><Navigation /></a></div></div>}</section><section className="section section--paper"><div className="shell"><div className="center-heading"><p className="eyebrow">PLAN AHEAD</p><h2>One trip. <em>A full basket.</em></h2><p>Reserve from participating farmers and collect everything in your chosen window.</p></div><div className="simple-card-grid markets-plan-grid">{db.markets.map((market) => <article key={market.id}><span>{market.day.slice(0, 3)}</span><h3>{market.name}</h3><p>{market.description}</p><p>{market.day} - {market.hours}</p><p>{market.address}</p><div className="market-card-actions"><a className="arrow-link" href={marketDirectionsUrl(market)} target="_blank" rel="noreferrer">View Map <Navigation /></a><Link className="arrow-link" to={`/markets/${market.id}`}>View market <ArrowRight /></Link></div></article>)}</div></div></section></main>
}
