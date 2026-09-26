import { Leaf, Menu, ShoppingBasket, UserRound, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import NotificationDropdown from '../shared/NotificationDropdown'

const links = [
  ['/', 'Home'],
  ['/collections', 'Collections'],
  ['/products', 'Fresh Produce'],
  ['/markets', 'Markets'],
  ['/farmers', 'Farmers'],
  ['/trip', 'Plan My Trip'],
  ['/about', 'Our Story'],
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const { count } = useCart()
  const { pathname } = useLocation()
  const onHero = pathname === '/'
  return (
    <header onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false) }} className={`site-nav ${onHero ? 'site-nav--hero' : ''}`}>
      <div className="nav-inner">
        <Link to="/" className="brand" onClick={() => setOpen(false)}><span><Leaf /></span><b>MarketLink</b></Link>
        <nav id="main-navigation" aria-label="Main navigation" className={open ? 'nav-links is-open' : 'nav-links'}>
          {links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}>{label}</NavLink>)}
          <div className="mobile-actions">
            {user ? <><Link className="btn btn--ghost" to={`/${user.role}/dashboard`}>Dashboard</Link><button className="btn" onClick={logout}>Log out</button></> : <><Link className="btn btn--ghost" to="/login">Log in</Link><Link className="btn" to="/register">Join now</Link></>}
          </div>
        </nav>
        <div className="nav-actions">
          {user && <NotificationDropdown />}
          {user ? <><Link className="nav-user" to={`/${user.role}/dashboard`}><UserRound />{user.name.split(' ')[0]}</Link><button className="text-btn" onClick={logout}>Log out</button></> : <><Link className="text-btn" to="/login">Log in</Link><Link className="btn btn--harvest" to="/register">Join MarketLink</Link></>}
          <Link className="cart-button" to="/cart" aria-label={`Basket with ${count} items`}><ShoppingBasket />{count > 0 && <span>{count}</span>}</Link>
        </div>
        <button className="menu-btn" onClick={() => setOpen((value) => !value)} aria-label="Toggle navigation" aria-expanded={open} aria-controls="main-navigation">{open ? <X /> : <Menu />}</button>
      </div>
    </header>
  )
}
