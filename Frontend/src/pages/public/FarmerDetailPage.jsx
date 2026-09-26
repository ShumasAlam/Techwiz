import { ArrowLeft, CalendarDays, Heart, Leaf, MapPin } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import api from '../../api'
import ProductCard from '../../components/shared/ProductCard'
import StarRating from '../../components/shared/StarRating'
import { useAuth } from '../../context/AuthContext'

export default function FarmerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, toggleFavorite } = useAuth()
  const db = api.snapshot()
  const farmer = db.farmers.find((item) => item.id === id)
  if (!farmer) return <Navigate to="/farmers" replace />
  const products = db.products.filter((item) => item.farmerId === id)
  const available = products.filter((item) => item.available && item.stock > 0)
  const markets = db.markets.filter((item) => farmer.marketIds.includes(item.id))
  const reviews = db.reviews.filter((review) => products.some((product) => product.id === review.productId))
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const openToday = farmer.status === 'approved' && available.length > 0 && markets.some((market) => market.day.includes(today))
  const saved = user?.favorites?.includes(id)
  const favorite = async () => {
    if (!user) { navigate('/login', { state: { from: `/farmers/${id}` } }); return }
    try { await toggleFavorite(id) } catch (error) { toast.error(error.message) }
  }
  return <main><section className="farmer-profile-hero"><div className="shell"><Link className="back-light" to="/farmers"><ArrowLeft /> All farmers</Link><div className="farmer-hero-grid"><div><div className="farmer-avatar-large" aria-label={`${farmer.name} avatar`}>{farmer.initials}<Leaf /></div><p className="eyebrow eyebrow--gold">LOCAL FARMER · DEMO PROFILE</p><h1>{farmer.name}</h1><p>Contact: {farmer.owner}</p><p>{farmer.bio}</p><div className="profile-rating"><StarRating value={farmer.rating} /><span>{farmer.reviews} reviews</span></div><button className="btn btn--harvest" onClick={favorite}><Heart />{saved ? 'Unsave farmer' : 'Favorite Farmer'}</button></div><div className="farmer-profile-summary"><h2>Markets & pickup</h2><p>{openToday ? 'Available Today — scheduled market day' : 'Available Today: No — see operating days below'}</p><p>{available.length} products in stock for scheduled pickup</p>{markets.map((market) => <div key={market.id}><Link to={`/markets/${market.id}`}>{market.name}</Link><p>{market.day} · {market.hours}</p><p><MapPin size={16} /> {market.address}</p></div>)}</div></div></div></section>
    <section className="section section--sage"><div className="shell info-grid"><div><p className="eyebrow">ABOUT</p><h2>Meet {farmer.owner}.</h2></div><div><p>{farmer.bio}</p><p>{farmer.years} years of market experience.</p><h3>Specialties</h3><p>{farmer.specialties.join(' · ')}</p></div></div></section>
    <section className="section section--paper"><div className="shell"><div className="section-heading"><div><p className="eyebrow">AVAILABLE PRODUCTS</p><h2>This week at <em>{farmer.name.split(' ')[0]}.</em></h2></div><p>{available.length} available · stock shown on each listing.</p></div><div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} farmer={farmer} />)}</div>{!products.length && <p>No products listed yet.</p>}</div></section>
    <section className="section section--sage"><div className="shell pickup-grid"><div><p className="eyebrow">MARKETS & PICKUP</p><h2>Plan your visit.</h2><p>Collect at the farmer’s stall during market hours.</p></div><div>{markets.map((market) => <article key={market.id}><Link to={`/markets/${market.id}`} className="pickup-row"><span><CalendarDays /></span><div><small>{market.day}</small><h3>{market.name}</h3><p>{market.address}</p><p>{market.hours}</p></div><b>View Market</b></Link><a className="arrow-link" href={`https://www.openstreetmap.org/directions?to=${market.lat},${market.lng}`} target="_blank" rel="noreferrer">Directions</a></article>)}{!markets.length && <p>No pickup markets assigned yet.</p>}</div></div></section>
    <section className="section section--paper"><div className="shell"><p className="eyebrow">REVIEWS</p><h2>Customer notes</h2><div className="review-grid">{reviews.map((review) => <article key={review.id}><StarRating value={review.rating} /><b>{review.customer}</b><p>{products.find((item) => item.id === review.productId)?.name}</p><p>{review.comment}</p><small>{review.date}</small>{review.response && <p><b>Farmer response:</b> {review.response}</p>}</article>)}</div>{!reviews.length && <p>No written reviews yet.</p>}</div></section>
  </main>
}
