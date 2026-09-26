import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../api'
import ProductCard from '../../components/shared/ProductCard'
import Reveal from '../../components/shared/Reveal'
import useDebounce from '../../hooks/useDebounce'
import { getAvailability } from '../../utils/helpers'

const sortOptions = [
  ['recommended', 'Recommended'],
  ['price-low', 'Price: Low → High'],
  ['price-high', 'Price: High → Low'],
  ['nearest', 'Nearest'],
  ['rating', 'Highest Rated'],
  ['freshest', 'Freshest'],
  ['popular', 'Popular'],
]

export default function ProductsPage() {
  const db = api.snapshot()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('search') || '')
  const [category, setCategory] = useState(params.get('category') || 'All')
  const [subcategory, setSubcategory] = useState(params.get('subcategory') || 'All')
  const [market, setMarket] = useState(params.get('market') || 'All')
  const [farmerId, setFarmerId] = useState(params.get('farmer') || 'All')
  const [availability, setAvailability] = useState('All')
  const [minRating, setMinRating] = useState(0)
  const [maxDistance, setMaxDistance] = useState(10)
  const [minPrice, setMinPrice] = useState(0)
  const [unit, setUnit] = useState('All')
  const [maxPrice, setMaxPrice] = useState(1000)
  const [freshToday, setFreshToday] = useState(params.get('freshToday') === '1')
  const [seasonal, setSeasonal] = useState(params.get('seasonal') === '1')
  const [popularOnly, setPopularOnly] = useState(params.get('popular') === '1')
  const [restockedOnly, setRestockedOnly] = useState(params.get('restocked') === '1')
  const [showMore, setShowMore] = useState(false)
  const filterPanel = useRef(null)
  useEffect(() => {
    if (!showMore) return
    const previous = document.activeElement
    const mobile = window.matchMedia('(max-width: 640px)').matches
    const oldOverflow = document.body.style.overflow
    if (mobile) document.body.style.overflow = 'hidden'
    filterPanel.current?.querySelector('button')?.focus()
    return () => { document.body.style.overflow = oldOverflow; previous?.focus() }
  }, [showMore])
  const [sort, setSort] = useState('recommended')
  const query = useDebounce(search)

  const categories = ['All', ...new Set(db.products.map((item) => item.category))]
  const subcategories = ['All', ...new Set(db.products.filter((item) => category === 'All' || item.category === category).map((item) => item.subcategory).filter(Boolean))]

  const results = useMemo(() => {
    const filtered = db.products.filter((product) => {
      const farmer = db.farmers.find((item) => item.id === product.farmerId)
      const av = getAvailability(product)
      if (query && !`${product.name} ${farmer?.name}`.toLowerCase().includes(query.toLowerCase())) return false
      if (category !== 'All' && product.category !== category) return false
      if (subcategory !== 'All' && product.subcategory !== subcategory) return false
      if (market !== 'All' && !product.marketIds.includes(market)) return false
      if (farmerId !== 'All' && product.farmerId !== farmerId) return false
      if (availability !== 'All' && (availability === 'available' ? !product.available || product.stock <= 0 : av.key !== availability)) return false
      if (minRating > 0 && product.rating < minRating) return false
      if (product.distanceKm != null && product.distanceKm > maxDistance) return false
      if (unit !== 'All' && product.unit !== unit) return false
      if (product.price < minPrice || product.price > maxPrice) return false
      if (freshToday && !product.freshToday) return false
      if (seasonal && !product.seasonal) return false
      if (popularOnly && !product.popular) return false
      if (restockedOnly && !product.recentlyRestocked) return false
      return true
    })
    const sorted = [...filtered].sort((a, b) => {
      if (sort === 'price-low') return a.price - b.price
      if (sort === 'price-high') return b.price - a.price
      if (sort === 'nearest') return (a.distanceKm ?? 99) - (b.distanceKm ?? 99)
      if (sort === 'rating') return b.rating - a.rating
      if (sort === 'freshest') return (a.freshToday ? 0 : a.harvestDaysAgo ?? 999) - (b.freshToday ? 0 : b.harvestDaysAgo ?? 999)
      if (sort === 'popular') return Number(b.popular) - Number(a.popular) || b.reviews - a.reviews
      return Number(b.available) - Number(a.available) || b.rating - a.rating
    })
    return sorted
  }, [query, category, subcategory, market, farmerId, availability, minRating, maxDistance, minPrice, unit, maxPrice, freshToday, seasonal, popularOnly, restockedOnly, sort, db])

  const resetFilters = () => {
    setSearch(''); setCategory('All'); setSubcategory('All'); setMarket('All'); setFarmerId('All')
    setMinPrice(0); setUnit('All'); setAvailability('All'); setMinRating(0); setMaxDistance(10); setMaxPrice(1000)
    setFreshToday(false); setSeasonal(false); setPopularOnly(false); setRestockedOnly(false); setSort('recommended')
    setParams({})
  }

  const chips = [
    [search && 'Search: ' + search, () => setSearch('')],
    [category !== 'All' && category, () => { setCategory('All'); setSubcategory('All') }],
    [subcategory !== 'All' && subcategory, () => setSubcategory('All')],
    [market !== 'All' && db.markets.find((item) => item.id === market)?.name, () => setMarket('All')],
    [farmerId !== 'All' && db.farmers.find((item) => item.id === farmerId)?.name, () => setFarmerId('All')],
    [availability !== 'All' && availability, () => setAvailability('All')],
    [minPrice > 0 && 'Min Rs ' + minPrice, () => setMinPrice(0)],
    [maxPrice < 1000 && 'Max Rs ' + maxPrice, () => setMaxPrice(1000)],
    [minRating > 0 && minRating + '+ stars', () => setMinRating(0)],
    [maxDistance < 10 && maxDistance + ' km', () => setMaxDistance(10)],
    [unit !== 'All' && unit, () => setUnit('All')],
    [freshToday && 'Fresh Today', () => setFreshToday(false)], [seasonal && 'Seasonal', () => setSeasonal(false)],
    [popularOnly && 'Popular', () => setPopularOnly(false)], [restockedOnly && 'Recently Restocked', () => setRestockedOnly(false)],
  ].filter(([label]) => label)
  return <main><section className="page-hero"><div className="shell"><p className="eyebrow eyebrow--gold">LIVE FARM STOCK</p><h1>What's fresh <em>this week.</em></h1><p>Real availability, updated directly by growers. Reserve before the best baskets disappear.</p></div></section>
    <section className="section section--paper">
      <div className="shell">
        <div className="catalog-toolbar">
          <label className="search-field"><Search /><input aria-label="Search produce or farmers" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search produce or farmers" />{search && <button aria-label="Clear search" onClick={() => setSearch('')}><X /></button>}</label>
          <label><SlidersHorizontal /> Market<select value={market} onChange={(event) => setMarket(event.target.value)}><option value="All">All markets</option>{db.markets.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Sort<select value={sort} onChange={(event) => setSort(event.target.value)}>{sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>

        <div className="filter-pills filter-pills--catalog">{categories.map((item) => <button key={item} className={category === item ? 'is-active' : ''} onClick={() => { setCategory(item); setSubcategory('All') }}>{item === 'Fruit' ? 'Fruits' : item}</button>)}</div>
        {subcategories.length > 1 && <div className="filter-pills filter-pills--catalog filter-pills--sub">{subcategories.map((item) => <button key={item} className={subcategory === item ? 'is-active' : ''} onClick={() => setSubcategory(item)}>{item}</button>)}</div>}

        <button className="advanced-toggle" onClick={() => setShowMore((value) => !value)} aria-expanded={showMore} type="button">{showMore ? 'Hide filters' : 'More filters'} <SlidersHorizontal /></button>

        {showMore && (
          <div className="filter-backdrop" onClick={() => setShowMore(false)}><div className="advanced-filters" ref={filterPanel} role="region" aria-label="Product filters" onKeyDown={(event) => { if (event.key === 'Escape') setShowMore(false); if (event.key === 'Tab' && window.matchMedia('(max-width: 640px)').matches) { const controls = [...filterPanel.current.querySelectorAll('button, input, select')].filter((item) => !item.disabled); const first = controls[0]; const last = controls.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() } } }} onClick={(event) => event.stopPropagation()}>
            <button className="text-btn filter-close" onClick={() => setShowMore(false)}>Done / Close filters</button>
            <label>Farmer<select value={farmerId} onChange={(event) => setFarmerId(event.target.value)}><option value="All">All farmers</option>{db.farmers.filter((farmer) => farmer.status === 'approved').map((farmer) => <option key={farmer.id} value={farmer.id}>{farmer.name}</option>)}</select></label>
            <label>Availability<select value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="All">Any availability</option><option value="available">In Stock (any quantity)</option><option value="limited">Limited Stock</option><option value="almost-gone">Almost Sold Out</option><option value="restocked">Recently Restocked</option><option value="sold-out">Sold Out</option></select></label>
            <label>Min rating<select value={minRating} onChange={(event) => setMinRating(Number(event.target.value))}><option value={0}>Any rating</option><option value={4}>4+ stars</option><option value={4.5}>4.5+ stars</option><option value={4.8}>4.8+ stars</option></select></label>
            <label>Unit<select value={unit} onChange={(event) => setUnit(event.target.value)}><option value="All">All units</option>{[...new Set(db.products.map((product) => product.unit))].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Min price (Rs)<input type="number" min="0" max={maxPrice} value={minPrice} onChange={(event) => setMinPrice(Math.min(maxPrice, Math.max(0, Number(event.target.value))))} /></label>
            <label>Max price: Rs {maxPrice}<input type="range" min="50" max="1000" step="10" value={maxPrice} onChange={(event) => setMaxPrice(Math.max(minPrice, Number(event.target.value)))} /></label>
            <label>Max distance: {maxDistance} km<input type="range" min="1" max="10" step="0.5" value={maxDistance} onChange={(event) => setMaxDistance(Number(event.target.value))} /></label>
            <div className="advanced-toggles">
              <label className="toggle-pill"><input type="checkbox" checked={freshToday} onChange={(event) => setFreshToday(event.target.checked)} /> Fresh Today (harvested today)</label>
              <label className="toggle-pill"><input type="checkbox" checked={seasonal} onChange={(event) => setSeasonal(event.target.checked)} /> Seasonal</label>
              <label className="toggle-pill"><input type="checkbox" checked={popularOnly} onChange={(event) => setPopularOnly(event.target.checked)} /> Popular</label>
              <label className="toggle-pill"><input type="checkbox" checked={restockedOnly} onChange={(event) => setRestockedOnly(event.target.checked)} /> Recently Restocked</label>
            </div>
            <button className="text-btn" onClick={resetFilters} type="button">Reset all filters</button>
          </div></div>
        )}

        <div className="filter-pills active-filter-chips">{chips.map(([label, clear]) => <button key={label} onClick={clear} aria-label={`Remove ${label} filter`}>{label} <X size={12} /></button>)}{chips.length > 0 && <button onClick={resetFilters}>Clear All</button>}</div>
        <div className="results-line"><span>{results.length} results</span><span>Stock changes as reservations arrive</span></div>
        {results.length ? <div className="product-grid">{results.map((product, index) => <Reveal key={product.id} delay={(index % 3) * 80}><ProductCard product={product} farmer={db.farmers.find((item) => item.id === product.farmerId)} /></Reveal>)}</div> : <div className="empty-state"><Search /><h2>No harvest found</h2><p>Try another category, market, or search term.</p><button className="btn btn--outline" onClick={resetFilters}>Clear Filters</button></div>}
      </div>
    </section>
  </main>
}
