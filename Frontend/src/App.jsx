import { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import ErrorBoundary from './components/shared/ErrorBoundary'
import Footer from './components/layout/Footer'
import Navbar from './components/layout/Navbar'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AIChatbot from './components/shared/AIChatbot'
import CompareDrawer from './components/shared/CompareDrawer'
import Loader from './components/shared/Loader'
import api from './api'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { CompareProvider } from './context/CompareContext'

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const CartPage = lazy(() => import('./pages/customer/CartPage'))
const CheckoutPage = lazy(() => import('./pages/customer/PickupCheckoutPage'))
const CustomerDashboard = lazy(() => import('./pages/customer/CustomerDashboard'))
const CustomerOrderDetailPage = lazy(() => import('./pages/customer/CustomerOrderDetailPage'))
const FarmerDashboard = lazy(() => import('./pages/farmer/FarmerDashboard'))
const ProductFormPage = lazy(() => import('./pages/farmer/ProductFormPage'))
const AboutPage = lazy(() => import('./pages/public/AboutPage'))
const CollectionsPage = lazy(() => import('./pages/public/CollectionsPage'))
const ComparePage = lazy(() => import('./pages/public/ComparePage'))
const ContactPage = lazy(() => import('./pages/public/ContactPage'))
const FarmerDetailPage = lazy(() => import('./pages/public/FarmerDetailPage'))
const FarmersPage = lazy(() => import('./pages/public/FarmersPage'))
const HomePage = lazy(() => import('./pages/public/HomePage'))
const LoginPage = lazy(() => import('./pages/public/LoginPage'))
const MarketDetailPage = lazy(() => import('./pages/public/MarketDetailPage'))
const MarketsPage = lazy(() => import('./pages/public/MarketsPage'))
const PlanTripPage = lazy(() => import('./pages/public/PlanTripPage'))
const ProductDetailPage = lazy(() => import('./pages/public/ProductDetailPage'))
const ProductsPage = lazy(() => import('./pages/public/ProductsPage'))
const RegisterPage = lazy(() => import('./pages/public/RegisterPage'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])
  return null
}

function AppShell() {
  const [, refresh] = useState(0)
  useEffect(() => { const update = () => refresh((value) => value + 1); window.addEventListener('marketlink:data', update); window.addEventListener('storage', update); return () => { window.removeEventListener('marketlink:data', update); window.removeEventListener('storage', update) } }, [])
  const [loaded, setLoaded] = useState(false)
  const { pathname, search } = useLocation()
  const immersive = ['/login', '/register'].includes(pathname)
  const portal = pathname === '/farmer/dashboard' || pathname === '/admin/dashboard'

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    let mounted = true
    let syncing = false
    const sync = async () => {
      if (syncing || document.hidden) return
      syncing = true
      try {
        await api.syncRemoteSnapshot?.()
        if (mounted) refresh((value) => value + 1)
      } catch {} finally {
        syncing = false
      }
    }
    const syncWhenVisible = () => { if (!document.hidden) void sync() }
    void sync()
    const interval = setInterval(sync, 800)
    window.addEventListener('focus', syncWhenVisible)
    document.addEventListener('visibilitychange', syncWhenVisible)
    return () => {
      mounted = false
      clearInterval(interval)
      window.removeEventListener('focus', syncWhenVisible)
      document.removeEventListener('visibilitychange', syncWhenVisible)
    }
  }, [])

  return <>
    <Loader done={loaded} />
    <ScrollToTop />
    {!immersive && !portal && <Navbar />}
    <a className="skip-link" href="#page-content">Skip to content</a><div id="page-content" tabIndex={-1}><Suspense fallback={null}><Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/collections" element={<CollectionsPage />} />
      <Route path="/products" element={<ProductsPage key={search} />} />
      <Route path="/products/:id" element={<ProductDetailPage />} />
      <Route path="/compare/:productId" element={<ComparePage />} />
      <Route path="/trip" element={<PlanTripPage />} />
      <Route path="/markets" element={<MarketsPage />} />
      <Route path="/markets/:id" element={<MarketDetailPage />} />
      <Route path="/farmers" element={<FarmersPage />} />
      <Route path="/farmers/:id" element={<FarmerDetailPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<ProtectedRoute role="customer"><CheckoutPage /></ProtectedRoute>} />
      <Route path="/customer/dashboard" element={<ProtectedRoute role="customer"><CustomerDashboard /></ProtectedRoute>} />
      <Route path="/customer/orders/:id" element={<ProtectedRoute role="customer"><CustomerOrderDetailPage /></ProtectedRoute>} />
      <Route path="/farmer/dashboard" element={<ProtectedRoute role="farmer"><FarmerDashboard /></ProtectedRoute>} />
      <Route path="/farmer/products/new" element={<ProtectedRoute role="farmer"><ProductFormPage /></ProtectedRoute>} />
      <Route path="/farmer/products/:id/edit" element={<ProtectedRoute role="farmer"><ProductFormPage /></ProtectedRoute>} />
      <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="*" element={<HomePage />} />
    </Routes></Suspense></div>
    {!immersive && !portal && <CompareDrawer />}
    {!immersive && !portal && <Footer />}
    {!immersive && !portal && <AIChatbot />}
    <Toaster position="top-right" richColors />
  </>
}

export default function App() {
  return <BrowserRouter><ErrorBoundary><AuthProvider><CartProvider><CompareProvider><AppShell /></CompareProvider></CartProvider></AuthProvider></ErrorBoundary></BrowserRouter>
}
