import { ArrowRight, CalendarCheck, Check, Clock3, LocateFixed, MapPin, Search, ShoppingBasket, Store, Truck, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api'
import { toast } from 'sonner'
import useLocalStorage from '../../hooks/useLocalStorage'
import marketCrate from '../../assets/market-crate.jpg'
import AsciiWave from '../../components/lightswind/ascii-wave'
import CoolSlideGallery from '../../components/lightswind/cool-slide-gallery'
import ProductCard from '../../components/shared/ProductCard'
import Reveal from '../../components/shared/Reveal'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency, getInitials } from '../../utils/helpers'

const areaKeywords = {
  dha: ['dha', 'phase 5', 'defence'],
  gulberg: ['gulberg', 'liberty'],
  'model town': ['model town'],
}

function areaFromText(text = '') {
  const value = text.toLowerCase()
  return Object.entries(areaKeywords).find(([, keywords]) => keywords.some((keyword) => value.includes(keyword)))?.[0] || ''
}

function sortMarketsForLocation(markets, userLocation, liveLocation) {
  const area = areaFromText(userLocation)
  return [...markets].sort((first, second) => {
    if (liveLocation) {
      const distanceA = Math.hypot(first.lat - liveLocation.lat, first.lng - liveLocation.lng)
      const distanceB = Math.hypot(second.lat - liveLocation.lat, second.lng - liveLocation.lng)
      return distanceA - distanceB
    }
    const score = (market) => area && areaFromText(`${market.name} ${market.address}`) === area ? -1 : Number.parseFloat(market.distance)
    return score(first) - score(second)
  })
}

function heroSlidesFromData(db) {
  const sales = db.orders.reduce((totals, order) => {
    order.items.forEach((item) => {
      totals[item.productId] = (totals[item.productId] || 0) + item.quantity
    })
    return totals
  }, {})
  const liveProducts = db.products.filter((product) => product.available && product.stock > 0)
  const farmerFor = (product) => db.farmers.find((farmer) => farmer.id === product.farmerId)
  const newStock = [...liveProducts]
    .sort((first, second) => ((farmerFor(second)?.rating || 0) + (sales[second.id] || 0)) - ((farmerFor(first)?.rating || 0) + (sales[first.id] || 0)) || second.stock - first.stock)
    .slice(0, 3)
  const trending = [...liveProducts]
    .sort((first, second) => (sales[second.id] || 0) - (sales[first.id] || 0) || second.reviews - first.reviews)
    .slice(0, 3)
  const topFarmers = [...db.farmers]
    .filter((farmer) => farmer.status === 'approved')
    .sort((first, second) => second.rating - first.rating || second.reviews - first.reviews)
    .slice(0, 3)

  return [
    {
      badge: 'New Stock',
      title: 'Fresh drops',
      subtitle: 'Top-rated vendors just added',
      items: newStock.map((product) => {
        const farmer = farmerFor(product)
        return {
          icon: getInitials(product.name),
          name: product.name,
          detail: farmer?.name || 'Local vendor',
          value: formatCurrency(product.price),
          meta: `${product.stock} ${product.unit}s`,
          href: `/products/${product.id}`,
        }
      }),
    },
    {
      badge: 'Trending',
      title: 'Most reserved',
      subtitle: 'Highest sales this week',
      items: trending.map((product) => ({
        icon: getInitials(product.name),
        name: product.name,
        detail: `${sales[product.id] || product.reviews} sales signals`,
        value: formatCurrency(product.price),
        meta: `${product.stock} left`,
        href: `/products/${product.id}`,
      })),
    },
    {
      badge: 'Top Farmers',
      title: 'Best profiles',
      subtitle: 'Most loved growers',
      items: topFarmers.map((farmer) => ({
        icon: farmer.initials || getInitials(farmer.name),
        name: farmer.name,
        detail: farmer.specialties.join(' / '),
        value: `${farmer.rating}`,
        meta: `${farmer.reviews} reviews`,
        href: `/farmers/${farmer.id}`,
      })),
    },
  ]
}

export default function HomePage() {
  const db = api.snapshot()
  const { user } = useAuth()
  const [announcements] = useLocalStorage('marketlink_announcements', [])
  const [category, setCategory] = useState('All harvest')
  const [favorites, setFavorites] = useState([])
  const [location, setLocation] = useState(user?.address || '')
  const [liveLocation, setLiveLocation] = useState(null)
  const navigate = useNavigate()
  const categories = ['All harvest', 'Vegetables', 'Fruit', 'Dairy', 'Bakery']
  const products = useMemo(() => category === 'All harvest' ? db.products.slice(0, 4) : db.products.filter((item) => item.category === category).slice(0, 4), [category, db.products])
  const seasonalProducts = useMemo(() => [...db.products].filter((item) => item.seasonal && item.available).sort((a, b) => a.id.localeCompare(b.id)).slice(0, 4), [db.products])
  const heroSlides = useMemo(() => heroSlidesFromData(db), [db])
  const nearbyMarkets = useMemo(() => sortMarketsForLocation(db.markets, location || user?.address, liveLocation), [db.markets, location, liveLocation, user?.address])
  const mapTarget = liveLocation ? `${liveLocation.lat},${liveLocation.lng}` : `${nearbyMarkets[0]?.address || 'DHA Lahore'} farmers market`
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(mapTarget)}&z=13&output=embed`
  const toggleFavorite = (id) => setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const useLiveLocation = () => {
    if (!navigator.geolocation) { toast.error('Location is not supported. Enter your area instead.'); return }
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setLiveLocation({ lat: coords.latitude, lng: coords.longitude })
      setLocation('Live location')
    }, () => toast.error('Could not get your location. Enter your area instead.'))
  }

  useEffect(() => { document.title = 'MarketLink - Fresh before you go' }, [])

  return (
    <main>{announcements.length > 0 && <aside className="public-announcements shell" aria-label="Market announcements">{announcements.slice(0, 3).map((item) => <p key={item.id}><b>Market notice:</b> {item.title}</p>)}</aside>}
      <section className="hero">
        <div className="hero-scene"><AsciiWave color="#f97316" speed={1} /></div>
        <div className="hero-vignette" />
        <div className="hero-content shell">
          <div className="hero-copy">
            <p className="eyebrow eyebrow--light"><span /> Picked nearby. Ready when you are.</p>
            <h1>Know what's <em>fresh</em> before you go.</h1>
            <p className="hero-lede">See what local farmers picked today. Reserve your basket and collect it at the market, no wasted trips, no wilted surprises.</p>
            <div className="hero-gallery hero-gallery--mobile">
              <CoolSlideGallery slides={heroSlides} cardWidth={360} cardHeight={430} showTitle showArrows showDots draggable autoplay />
            </div>
            <form className="hero-search" onSubmit={(event) => { event.preventDefault(); navigate(`/markets${location ? `?near=${encodeURIComponent(location)}` : ''}`) }}>
              <label><MapPin /><input value={location} onChange={(event) => { setLocation(event.target.value); setLiveLocation(null) }} placeholder="Enter your neighbourhood or postcode" aria-label="Your location" /></label>
              <button className="btn" type="submit"><Search /> Find fresh food</button>
            </form>
            <div className="hero-trust"><span><Check /> Live stock</span><span><Check /> Reserve free</span><span><Check /> Pay at pickup</span></div>
          </div>
          <div className="hero-gallery hero-gallery--desktop">
            <CoolSlideGallery slides={heroSlides} cardWidth={360} cardHeight={430} showTitle showArrows showDots draggable autoplay />
          </div>
        </div>
        <div className="next-market"><span><Clock3 /></span><div><small>NEXT MARKET OPENS</small><strong>Saturday, 8:00 AM</strong></div></div>
        <a className="scroll-cue" href="#harvest"><span>Scroll to explore</span><i /></a>
      </section>

      <section id="harvest" className="section section--paper section--compact">
        <div className="shell">
          <Reveal className="section-heading"><div><p className="eyebrow">THIS WEEK'S HARVEST</p><h2>Fresh now, <em>not someday.</em></h2></div><p>Stock updates come directly from local farmers, so what you see is what you can collect.</p></Reveal>
          <div className="filter-pills">{categories.map((item) => <button key={item} className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
          <div className="product-grid">{products.map((product, index) => <Reveal key={product.id} delay={index * 70}><ProductCard product={product} farmer={db.farmers.find((item) => item.id === product.farmerId)} favorite={favorites.includes(product.id)} onFavorite={toggleFavorite} /></Reveal>)}</div>
          <div className="section-link"><Link to="/products">Browse the whole harvest <ArrowRight /></Link></div>
        </div>
      </section>

      <section className="section section--paper section--compact">
        <div className="shell">
          <Reveal className="section-heading"><div><p className="eyebrow">SEASONAL</p><h2>What's fresh <em>this season?</em></h2></div><p>A steady, deterministic pick of what's in season right now — not randomised, so it stays accurate week to week.</p></Reveal>
          <div className="product-grid">{seasonalProducts.map((product, index) => <Reveal key={product.id} delay={index * 70}><ProductCard product={product} farmer={db.farmers.find((item) => item.id === product.farmerId)} /></Reveal>)}</div>
        </div>
      </section>

      <section className="section section--sage section--compact">
        <div className="shell market-feature">
          <Reveal className="market-list"><p className="eyebrow">NEAR YOU THIS WEEK</p><h2>Your market map, <em>made useful.</em></h2><p className="muted">Showing markets nearest to {location || user?.address || 'your area'}. See opening times, stalls and pickup points before leaving home.</p><div>{nearbyMarkets.map((market, index) => <Link key={market.id} to={`/markets/${market.id}`} className={index === 0 ? 'market-row is-active' : 'market-row'}><span className="market-date"><b>{market.date.split(' ')[0]}</b>{market.date.split(' ')[1]}</span><span><strong>{market.name}</strong><small>{market.hours} - {market.stalls} stalls</small></span><b>{market.distance}</b><ArrowRight /></Link>)}</div><div className="market-actions"><button className="btn btn--outline" type="button" onClick={useLiveLocation}><LocateFixed /> Use live location</button><Link className="btn btn--outline" to="/markets"><LocateFixed /> Explore every market</Link></div></Reveal>
          <Reveal delay={150} className="google-map-panel">
            <iframe title="Nearby MarketLink markets on Google Maps" src={mapSrc} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            <div className="map-card map-card--home"><MapPin /><span><small>Closest pickup area</small><b>{nearbyMarkets[0]?.name}</b></span></div>
          </Reveal>
        </div>
      </section>

      <section className="section section--ink">
        <div className="shell story-grid">
          <Reveal className="story-image"><img src={marketCrate} alt="Fresh vegetables in a wooden farm crate" /><div><span>12</span><p>years growing for Lahore</p></div></Reveal>
          <Reveal delay={140} className="story-copy"><p className="eyebrow eyebrow--gold">MEET YOUR GROWER</p><blockquote>"Good food should not have a mystery in the middle."</blockquote><p>Hassan and his family grow every Willow & Root harvest with soil-first methods, then update their stock themselves before each market.</p><div className="farmer-sign"><span>WR</span><div><strong>Hassan Ali</strong><small>Willow & Root Farm - Bedian Road</small></div></div><Link className="btn btn--harvest" to="/farmers/f-1">Visit the farm profile <ArrowRight /></Link></Reveal>
        </div>
      </section>

      <section className="section section--paper section--compact">
        <div className="shell">
          <Reveal className="center-heading"><p className="eyebrow">FROM FIELD TO PICKUP</p><h2>Three steps. <em>Zero guesswork.</em></h2></Reveal>
          <div className="steps-grid">
            <Reveal><article className="step-card"><span>01</span><div className="step-icon step-icon--search"><Search /><span className="orbit-dot" /></div><h3>Discover what's fresh</h3><p>Browse live stock from nearby farms and compare market days.</p></article></Reveal>
            <Reveal delay={100}><article className="step-card"><span>02</span><div className="step-icon step-icon--basket"><ShoppingBasket /><i /><i /></div><h3>Reserve your basket</h3><p>Choose quantities and a convenient pickup window. No payment needed online.</p></article></Reveal>
            <Reveal delay={200}><article className="step-card"><span>03</span><div className="step-icon step-icon--pickup"><Store /><Truck /></div><h3>Meet at the market</h3><p>Collect from the grower, pay in person, and take home food with a story.</p></article></Reveal>
          </div>
        </div>
      </section>

      <section className="cta-band"><div className="shell"><div><p className="eyebrow eyebrow--light">YOUR NEXT GOOD MEAL STARTS HERE</p><h2>Meet your market.</h2></div><div><Link className="btn btn--harvest" to="/register"><UserRound /> Create a free account</Link><Link className="btn btn--ghost-light" to="/markets"><CalendarCheck /> Find this week's market</Link></div></div></section>
    </main>
  )
}
