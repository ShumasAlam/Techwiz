import { ArrowRight, Clock3, Flame, RefreshCw, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

const fruitCollections = [
  { label: 'All Fruits', subcategory: '' },
  { label: 'Seasonal Fruits', subcategory: 'Seasonal Fruits' },
  { label: 'Citrus', subcategory: 'Citrus' },
  { label: 'Berries', subcategory: 'Berries' },
  { label: 'Tropical', subcategory: 'Tropical' },
  { label: 'Melons', subcategory: 'Melons' },
]

const vegCollections = [
  { label: 'All Vegetables', subcategory: '' },
  { label: 'Leafy Greens', subcategory: 'Leafy Greens' },
  { label: 'Root Vegetables', subcategory: 'Root Vegetables' },
  { label: 'Tomatoes & Peppers', subcategory: 'Tomatoes & Peppers' },
  { label: 'Herbs', subcategory: 'Herbs' },
  { label: 'Seasonal Vegetables', subcategory: 'Seasonal Vegetables' },
]

const quickCollections = [
  { label: 'Fresh Today', icon: Clock3, query: 'freshToday=1' },
  { label: 'Seasonal Produce', icon: Sparkles, query: 'seasonal=1' },
  { label: 'Popular', icon: Flame, query: 'popular=1' },
  { label: 'Recently Restocked', icon: RefreshCw, query: 'restocked=1' },
]

function CollectionGroup({ title, items, category }) {
  return (
    <div className="collection-group">
      <h3>{title}</h3>
      <div className="collection-links">
        {items.map((item) => (
          <Link key={item.label} to={`/products?category=${encodeURIComponent(category)}${item.subcategory ? `&subcategory=${encodeURIComponent(item.subcategory)}` : ''}`}>
            {item.label} <ArrowRight />
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function CollectionsPage() {
  return (
    <main>
      <section className="page-hero">
        <div className="shell">
          <p className="eyebrow eyebrow--gold">BROWSE BY COLLECTION</p>
          <h1>Shop the <em>harvest</em>, your way.</h1>
          <p>Jump straight to the produce you're after — by type, by season, or by what's moving fastest this week.</p>
        </div>
      </section>

      <section className="section section--paper">
        <div className="shell">
          <div className="section-heading"><div><p className="eyebrow">QUICK PICKS</p><h2>What's fresh <em>right now.</em></h2></div></div>
          <div className="quick-collections">
            {quickCollections.map(({ label, icon: Icon, query }) => (
              <Link key={label} to={`/products?${query}`} className="quick-collection-card">
                <span><Icon /></span>
                <b>{label}</b>
                <ArrowRight />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--sage">
        <div className="shell">
          <div className="section-heading"><div><p className="eyebrow">BY CATEGORY</p><h2>Your market <em>essentials.</em></h2></div></div>
          <div className="collections-columns">
            <CollectionGroup title="Fruits" items={fruitCollections} category="Fruit" />
            <CollectionGroup title="Vegetables" items={vegCollections} category="Vegetables" />
            {['Dairy', 'Eggs', 'Bakery', 'Other Produce'].map((category) => <CollectionGroup key={category} title={category === 'Bakery' ? 'Bakery / Baked Goods' : category} category={category} items={[{ label: 'All ' + category, subcategory: '' }]} />)}
          </div>
        </div>
      </section>
    </main>
  )
}
