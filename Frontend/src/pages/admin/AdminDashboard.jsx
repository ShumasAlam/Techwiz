import { BarChart3, Check, Clock3, Download, Layers, MapPin, Megaphone, MessageSquareWarning, ShieldCheck, ShoppingBasket, Star, Store, Tag, Trash2, Users, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import useLocalStorage from '../../hooks/useLocalStorage'
import MarketManager from './MarketManager'
import { downloadReport } from '../../utils/reports'
import { formatCurrency } from '../../utils/helpers'

const CATEGORY_SEED = ['Vegetables', 'Fruit', 'Bakery', 'Dairy', 'Eggs', 'Other Produce']
const ANNOUNCEMENT_SEED = [
  { id: 'a-1', title: 'Saturday market opens at 8 AM sharp', date: '24 Sep 2026' },
  { id: 'a-2', title: 'New reserved-order lane at DHA Evening Hall', date: '19 Sep 2026' },
]

export default function AdminDashboard() {
  const { logout } = useAuth()
  const [version, setVersion] = useState(0)
  const [tab, setTab] = useState('overview')
  const db = api.snapshot()
  const revenue = db.orders.reduce((sum, item) => sum + item.total, 0)
  const metrics = [
    { label: 'Registered farmers', value: db.farmers.length, change: '+2 this month', icon: Store },
    { label: 'Customers', value: db.users.filter((item) => item.role === 'customer').length, change: '+18% this month', icon: Users },
    { label: 'Total orders', value: db.orders.length, change: 'Across all markets', icon: ShoppingBasket },
    { label: 'Market revenue', value: formatCurrency(revenue), change: 'Paid directly to growers', icon: BarChart3 }
  ]

  // Feature 1: Farmer Status & Featured on Home Toggle
  const statusFarmer = async (id, status) => {
    await api.admin.updateFarmerStatus(id, status)
    setVersion(v => v + 1)
    toast.success(`Farmer ${status}`)
  }

  const toggleFeaturedFarmer = async (id, currentFeatured) => {
    await api.admin.toggleFarmerFeatured(id, !currentFeatured)
    setVersion(v => v + 1)
    toast.success(!currentFeatured ? 'Farmer featured on homepage' : 'Farmer unfeatured')
  }

  const chart = useMemo(() => [48, 62, 55, 82, 69, 96, 88], [])
  
  // Feature 2: Backend-backed Categories
  const [categories, setCategories] = useState(CATEGORY_SEED)
  const [newCategory, setNewCategory] = useState('')

  useEffect(() => {
    api.categories.list().then(res => {
      if (res && res.length) {
        setCategories(res.map(c => typeof c === 'string' ? c : c.name))
      }
    }).catch(() => {})
  }, [version])

  const [announcements, setAnnouncements] = useLocalStorage('marketlink_announcements', ANNOUNCEMENT_SEED)
  const [newAnnouncement, setNewAnnouncement] = useState('')

  const addCategory = async () => {
    if (!newCategory.trim() || categories.includes(newCategory.trim())) return
    const name = newCategory.trim()
    try {
      await api.categories.create(name)
      setCategories(c => [...c, name])
      setNewCategory('')
      setVersion(v => v + 1)
      toast.success('Category added to database')
    } catch (err) {
      toast.error(err.message || 'Error adding category')
    }
  }

  const removeCategory = async (name) => {
    try {
      await api.categories.remove(name)
      setCategories(c => c.filter(item => item !== name))
      setVersion(v => v + 1)
      toast.success('Category removed')
    } catch (err) {
      toast.error(err.message || 'Error removing category')
    }
  }

  const toggleListing = async (id) => {
    const product = db.products.find((item) => item.id === id)
    await api.products.update(id, { available: !product.available && product.stock > 0 })
    setVersion(version + 1)
    toast.success('Listing availability updated')
  }

  const removeReview = (id) => {
    api.reviews.remove(id)
    setVersion(version + 1)
    toast.success('Review removed')
  }

  const publishAnnouncement = () => {
    if (!newAnnouncement.trim()) return
    api.announcements.publish(newAnnouncement.trim())
    setAnnouncements((current) => [{ id: `a-${Date.now()}`, title: newAnnouncement.trim(), date: 'Today' }, ...current])
    setNewAnnouncement('')
    toast.success('Announcement published')
  }

  // Feature 3: Backend Reports Generation & CSV Export
  const handleExportReport = async (reportTitle) => {
    try {
      toast.info(`Generating ${reportTitle}...`)
      await api.reports.generate(reportTitle)
      const csv = await api.reports.downloadCSV(reportTitle)
      if (csv) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `${reportTitle.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success(`${reportTitle} downloaded from server!`)
      } else {
        downloadReport(reportTitle, db)
        toast.success(`${reportTitle} generated!`)
      }
    } catch {
      downloadReport(reportTitle, db)
      toast.success(`${reportTitle} generated!`)
    }
  }

  return (
    <main className="portal-page admin-portal">
      <aside className="portal-sidebar">
        <div>
          <p className="eyebrow eyebrow--gold">ADMIN CONSOLE</p>
          <h2>MarketLink</h2>
          <span className="status-pill status-pill--ready">System healthy</span>
        </div>
        <nav>
          <button className={tab === 'overview' ? 'is-active' : ''} onClick={() => setTab('overview')}><BarChart3 /> Overview</button>
          <button className={tab === 'farmers' ? 'is-active' : ''} onClick={() => setTab('farmers')}><Store /> Farmers <span>{db.farmers.length}</span></button>
          <button className={tab === 'users' ? 'is-active' : ''} onClick={() => setTab('users')}><Users /> Users</button>
          <button className={tab === 'markets' ? 'is-active' : ''} onClick={() => setTab('markets')}><MapPin /> Markets</button>
          <button className={tab === 'categories' ? 'is-active' : ''} onClick={() => setTab('categories')}><Tag /> Categories</button>
          <button className={tab === 'listings' ? 'is-active' : ''} onClick={() => setTab('listings')}><Layers /> Listings</button>
          <button className={tab === 'reviewMod' ? 'is-active' : ''} onClick={() => setTab('reviewMod')}><MessageSquareWarning /> Reviews</button>
          <button className={tab === 'announcements' ? 'is-active' : ''} onClick={() => setTab('announcements')}><Megaphone /> Announcements</button>
          <button className={tab === 'reports' ? 'is-active' : ''} onClick={() => setTab('reports')}><Download /> Reports</button>
          <button onClick={logout}>Logout</button>
        </nav>
        <div className="portal-tip">
          <ShieldCheck />
          <b>Server Administration</b>
          <p>Live database synchronisation with MongoDB Atlas.</p>
        </div>
      </aside>

      <section className="portal-content">
        <header>
          <div>
            <p className="eyebrow">PLATFORM CONTROL</p>
            <h1>{tab === 'overview' ? 'The market at a glance.' : tab === 'farmers' ? 'Farmer approvals & featured status.' : tab === 'users' ? 'Customer accounts.' : tab === 'markets' ? 'Market locations.' : tab === 'categories' ? 'Category management.' : tab === 'listings' ? 'Listing moderation.' : tab === 'reviewMod' ? 'Review moderation.' : tab === 'announcements' ? 'Announcements.' : 'Reports & exports.'}</h1>
          </div>
          {tab !== 'announcements' && <button className="btn btn--outline" onClick={() => setTab('announcements')}><Megaphone /> Publish notice</button>}
        </header>

        {tab === 'overview' && (
          <>
            <div className="portal-metrics">
              {metrics.map(({ label, value, change, icon: Icon }) => (
                <article key={label}><span><Icon /></span><small>{label}</small><b>{value}</b><p>{change}</p></article>
              ))}
            </div>
            <div className="admin-grid">
              <section className="portal-panel">
                <div className="panel-title"><div><p className="eyebrow">WEEKLY ACTIVITY</p><h2>Illustrative weekly activity</h2></div><b>Sample</b></div>
                <div className="bar-chart">{chart.map((height, index) => <div key={index}><span style={{ height: `${height}%` }} /><small>{['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'][index]}</small></div>)}</div>
              </section>
              <section className="portal-panel">
                <div className="panel-title"><div><p className="eyebrow">NEEDS REVIEW</p><h2>Pending farmers</h2></div></div>
                {db.farmers.filter((item) => item.status === 'pending').map((farmer) => (
                  <AdminFarmer key={farmer.id} farmer={farmer} onStatus={statusFarmer} />
                ))}
                {!db.farmers.some((item) => item.status === 'pending') && <div className="empty-strip"><Check /><span>All farmer profiles are reviewed.</span></div>}
              </section>
            </div>
          </>
        )}

        {tab === 'farmers' && (
          <section className="portal-panel">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Farm</th>
                    <th>Owner</th>
                    <th>Markets</th>
                    <th>Featured on Home</th>
                    <th>Rating</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {db.farmers.map((farmer) => (
                    <tr key={farmer.id}>
                      <td><b>{farmer.name}</b></td>
                      <td>{farmer.owner}</td>
                      <td>{farmer.marketIds.length}</td>
                      <td>
                        <button
                          className={`btn btn--small ${farmer.featured ? 'btn--harvest' : 'btn--outline'}`}
                          style={{ padding: '4px 8px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => toggleFeaturedFarmer(farmer.id, farmer.featured)}
                          title="Toggle featured status on homepage"
                        >
                          <Star size={14} fill={farmer.featured ? 'currentColor' : 'none'} />
                          {farmer.featured ? 'Featured' : 'Standard'}
                        </button>
                      </td>
                      <td>{farmer.rating || 'New'}</td>
                      <td><span className={`status-pill status-pill--${farmer.status}`}>{farmer.status}</span></td>
                      <td>
                        <div className="table-actions">
                          <button onClick={() => statusFarmer(farmer.id, 'approved')} title="Approve"><Check /></button>
                          <button onClick={() => statusFarmer(farmer.id, 'suspended')} title="Suspend"><X /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'users' && (
          <section className="portal-panel">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {db.users.map((user) => (
                    <tr key={user.id}>
                      <td><b>{user.name}</b></td>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                      <td>Sep 2026</td>
                      <td><span className="status-pill status-pill--ready">{user.status || 'active'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'markets' && <MarketManager markets={db.markets} onChange={() => setVersion(version + 1)} />}

        {tab === 'categories' && (
          <section className="portal-panel">
            <div className="panel-title"><div><p className="eyebrow">STORE CATEGORIES</p><h2>{categories.length} active categories (Live Database)</h2></div></div>
            <form className="inline-add-form" onSubmit={(event) => { event.preventDefault(); addCategory() }}>
              <input aria-label="New category name" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="New category name" />
              <button className="btn btn--small" type="submit">Add Category</button>
            </form>
            <div className="tag-chip-list">
              {categories.map((category) => (
                <span key={category} className="tag-chip">
                  {category}
                  <button
                    disabled={db.products.some((product) => product.category === category)}
                    title={db.products.some((product) => product.category === category) ? 'Category is used by existing products' : 'Remove category'}
                    onClick={() => removeCategory(category)}
                    aria-label={`Remove ${category}`}
                  >
                    <X />
                  </button>
                </span>
              ))}
            </div>
          </section>
        )}

        {tab === 'listings' && (
          <section className="portal-panel">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Product</th><th>Farmer</th><th>Category</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {db.products.map((product) => {
                    const farmer = db.farmers.find((item) => item.id === product.farmerId)
                    const hidden = !product.available
                    return (
                      <tr key={product.id}>
                        <td><b>{product.name}</b></td>
                        <td>{farmer?.name}</td>
                        <td>{product.category}</td>
                        <td>{formatCurrency(product.price)}</td>
                        <td><span className={`status-pill ${hidden ? 'status-pill--cancelled' : 'status-pill--ready'}`}>{hidden ? 'Unavailable' : 'Live'}</span></td>
                        <td>
                          <div className="table-actions">
                            <button
                              disabled={hidden && product.stock <= 0}
                              onClick={() => toggleListing(product.id)}
                              aria-label={hidden && product.stock <= 0 ? 'Farmer must restock before restoring' : hidden ? 'Restore listing' : 'Hide listing'}
                              title={hidden && product.stock <= 0 ? 'Farmer must restock before restoring' : hidden ? 'Restore' : 'Mark unavailable'}
                            >
                              {hidden ? <Check /> : <Trash2 />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'reviewMod' && (
          <section className="portal-panel">
            <div className="panel-title"><div><p className="eyebrow">FLAGGED & RECENT REVIEWS</p><h2>Moderate customer feedback</h2></div></div>
            <div className="farmer-reviews-list">
              {db.reviews.map((review) => {
                const product = db.products.find((item) => item.id === review.productId)
                return (
                  <article key={review.id} className="farmer-review-row">
                    <div className="farmer-review-head"><b>{product?.name}</b><span>{review.date}</span></div>
                    <p>"{review.comment}" — {review.customer}</p>
                    <footer>
                      <span>Rating: {review.rating}/5</span>
                      <button className="text-btn" onClick={() => removeReview(review.id)}>Remove review</button>
                    </footer>
                  </article>
                )
              })}
              {!db.reviews.length && <div className="empty-strip"><Check /><span>No reviews pending moderation.</span></div>}
            </div>
          </section>
        )}

        {tab === 'announcements' && (
          <section className="portal-panel">
            <div className="panel-title"><div><p className="eyebrow">PLATFORM ANNOUNCEMENTS</p><h2>Visible to all customers</h2></div></div>
            <form className="inline-add-form" onSubmit={(event) => { event.preventDefault(); publishAnnouncement() }}>
              <input aria-label="New announcement" value={newAnnouncement} onChange={(event) => setNewAnnouncement(event.target.value)} placeholder="Write a new announcement" />
              <button className="btn btn--small" type="submit"><Megaphone /> Publish</button>
            </form>
            <div className="announcement-list">
              {announcements.map((item) => (
                <article key={item.id} className="announcement-row">
                  <Clock3 />
                  <div><b>{item.title}</b><small>{item.date}</small></div>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === 'reports' && (
          <section className="reports-grid">
            {['Market activity report', 'Farmer revenue summary', 'Customer growth report', 'Inventory availability report'].map((report) => (
              <article key={report}>
                <Download />
                <h2>{report}</h2>
                <p>Server-side analytics and MongoDB Atlas aggregation.</p>
                <button className="btn btn--outline" onClick={() => handleExportReport(report)}>Generate & Download CSV</button>
              </article>
            ))}
          </section>
        )}
      </section>
    </main>
  )
}

function AdminFarmer({ farmer, onStatus }) {
  return (
    <article className="admin-farmer">
      <span>{farmer.initials}</span>
      <div><b>{farmer.name}</b><p>{farmer.owner} · {farmer.specialties.join(', ')}</p></div>
      <button onClick={() => onStatus(farmer.id, 'approved')}><Check /></button>
      <button className="danger" onClick={() => onStatus(farmer.id, 'suspended')}><X /></button>
    </article>
  )
}
