import { uid } from '../utils/helpers'
import tomatoes from '../assets/heirloom-tomatoes.jpg'
import carrots from '../assets/rainbow-carrots.jpg'
import sourdough from '../assets/sourdough.jpg'
import marketCrate from '../assets/market-crate.jpg'

const imageKeywords = [
  { match: /tomato/i, image: tomatoes },
  { match: /carrot/i, image: carrots },
  { match: /spinach|palak|greens|kale|herbs|basil/i, image: marketCrate },
  { match: /potato/i, image: carrots },
  { match: /onion/i, image: carrots },
  { match: /sourdough|bread|bun|biscuit|bakery/i, image: sourdough },
  { match: /apple|orange|citrus|mango|strawberr|watermelon|banana|fruit/i, image: marketCrate },
  { match: /egg/i, image: sourdough },
  { match: /milk|cheese|butter|yogurt|dairy/i, image: sourdough },
  { match: /honey|lentil/i, image: marketCrate },
]
const resolveFallbackImage = (product) => {
  if (product.image && product.image !== '') return product.image
  const text = `${product.name} ${product.category} ${product.subcategory || ''}`
  for (const entry of imageKeywords) {
    if (entry.match.test(text)) return entry.image
  }
  return marketCrate
}

const DB_KEY = 'marketlink_db_snapshot_v1'
const API_URL = (import.meta.env.VITE_API_URL || 'https://techwiz-backend-gold.vercel.app/api').replace(/\/$/, '')
const DEMO_USER_IDS = new Set(['u-customer', 'u-farmer', 'u-admin'])
const isDemoProduct = (item) => /^p-\d+$/.test(item?.id || '')
const isDemoFarmer = (item) => /^f-[1-5]$/.test(item?.id || '')
const isDemoMarket = (item) => /^m-[1-3]$/.test(item?.id || '')

const wait = (value, delay = 80) => new Promise((resolve) => setTimeout(() => resolve(value), delay))

const readDB = () => {
  try {
    const stored = localStorage.getItem(DB_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return {
    users: [],
    markets: [],
    farmers: [],
    products: [],
    stockSubscriptions: [],
    notifications: [],
    reviews: [],
    orders: [],
  };
};

const writeDB = (data) => {
  localStorage.setItem(DB_KEY, JSON.stringify(data))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('marketlink:data'))
  }
  return data
}

const remote = async (path, options = {}) => {
  if (!API_URL) throw new Error('Live API is not configured')
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('marketlink_token') : null
  const isFormData = options.body instanceof FormData
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  })
  if (!response.ok) {
    let message = `Request failed: ${response.status}`
    try {
      const body = await response.json()
      message = body.message || body.error || message
    } catch {}
    const error = new Error(message)
    error.status = response.status
    throw error
  }
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('text/csv')) {
    return response.text()
  }
  return response.json()
}

const localFirst = async (path, options, fallback) => {
  const result = await remote(path, options)
  const method = (options.method || 'GET').toUpperCase()
  if (!['GET', 'HEAD'].includes(method) && !path.startsWith('/auth/login')) {
    void syncRemoteSnapshot().catch(() => {})
  }
  return result
}

const hydrateDerivedFields = (db) => {
  db.stockSubscriptions ||= []
  db.notifications ||= []
  db.reviews ||= []
  db.orders ||= []
  db.users ||= []
  db.markets ||= []
  db.farmers ||= []
  db.products ||= []

  db.users = db.users.filter((user) => !DEMO_USER_IDS.has(user.id))
  db.markets = db.markets.filter((market) => !isDemoMarket(market))
  db.farmers = db.farmers.filter((farmer) => !isDemoFarmer(farmer))
  db.products = db.products.filter((product) => !isDemoProduct(product) && db.farmers.some((farmer) => farmer.id === product.farmerId))
  db.reviews = db.reviews.filter((review) => db.products.some((product) => product.id === review.productId))
  db.orders = db.orders.filter((order) => db.farmers.some((farmer) => farmer.id === order.farmerId) && (!order.marketId || db.markets.some((market) => market.id === order.marketId)))
  db.notifications = db.notifications.filter((notification) => !notification.userId || db.users.some((user) => user.id === notification.userId))
  db.stockSubscriptions = db.stockSubscriptions.filter((subscription) => db.products.some((product) => product.id === subscription.productId))

  db.products?.forEach((product) => {
    product.image = resolveFallbackImage(product)
    const isFreshProduce = ['Vegetables', 'Fruit', 'Fruits'].includes(product.category)
    const stockedThisMorning = isFreshProduce && (product.harvestDaysAgo ?? 0) === 0 && (product.lastUpdatedMinutesAgo ?? 0) <= 360
    product.stockedThisMorning = stockedThisMorning
    product.expiresInHours = stockedThisMorning ? Math.max(1, 24 - Math.ceil((product.lastUpdatedMinutesAgo ?? 0) / 60)) : 0
    product.freshWindow = stockedThisMorning && product.expiresInHours <= 24
  })
  db.farmers?.forEach((farmer) => {
    farmer.featured ??= false
  })
  return db
}

const syncRemoteSnapshot = async () => {
  if (!API_URL) return readDB()
  const snapshot = await remote('/snapshot')
  writeDB(hydrateDerivedFields(snapshot))
  return snapshot
}

const addNotification = (db, userId, type, text, details = {}) => {
  db.notifications.unshift({ id: uid('n'), userId, type, text, unread: true, createdAt: new Date().toLocaleString('en-GB'), ...details })
}

const restoreStock = (db, order) => {
  order.items.forEach(({ productId, quantity }) => {
    const product = db.products.find((item) => item.id === productId)
    if (product) {
      product.stock += quantity
      product.available = true
    }
  })
}

const reserveOrders = (db, payload) => {
  const { customerId, marketId, pickupDate, pickupSlot, items } = payload
  const customer = db.users.find((user) => user.id === customerId && user.role === 'customer')
  const market = db.markets.find((item) => item.id === marketId)
  if (!customer || customer.status === 'suspended') throw new Error('A current customer account is required to reserve.')
  if (!market || !pickupDate || !pickupSlot || !items?.length) throw new Error('Choose a valid market and pickup window.')

  const groups = new Map()
  for (const line of items) {
    const product = db.products.find((item) => item.id === line.productId)
    const farmer = db.farmers.find((item) => item.id === product?.farmerId)
    if (!product || !Number.isInteger(line.quantity) || line.quantity < 1 || product.stock < line.quantity || !product.available) {
      throw new Error(`${product?.name || 'An item'} is no longer available in the requested quantity.`)
    }
    if (!product.marketIds.includes(marketId) || !farmer?.marketIds.includes(marketId)) {
      throw new Error(`${product.name} cannot be collected at ${market.name}.`)
    }
    if (farmer.status !== 'approved') throw new Error(`${farmer.name} is not accepting reservations yet.`)
    const group = groups.get(farmer.id) || []
    group.push({ productId: product.id, name: product.name, price: product.price, quantity: line.quantity })
    groups.set(farmer.id, group)
  }

  const createdAt = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const orders = [...groups].map(([farmerId, groupItems]) => ({
    id: uid('ML').toUpperCase(), customerId, farmerId, marketId, pickupDate, pickupSlot,
    createdAt, status: 'placed',
    total: groupItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    items: groupItems,
  }))
  for (const order of orders) {
    for (const line of order.items) {
      const product = db.products.find((item) => item.id === line.productId)
      product.stock -= line.quantity
      product.available = product.stock > 0
    }
  }
  db.orders.unshift(...orders)
  orders.forEach((order) => addNotification(db, customerId, 'reminder', 'Pickup reminder: collect ' + order.id + ' at ' + market.name + ' on ' + pickupDate + ', ' + pickupSlot + '. Pay at pickup.', { orderId: order.id }))
  writeDB(db)
  return orders
}

export const api = {
  mode: 'live',
  syncRemoteSnapshot: () => syncRemoteSnapshot().catch((error) => {
    console.warn('MarketLink live API snapshot unavailable; continuing with cached database snapshot.', error.message)
    return readDB()
  }),

  health: {
    check: () => localFirst('/health', { method: 'GET' }, () => ({ status: 'ok', database: 'connected' })),
  },
  auth: {
    login: (email, password) => localFirst('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, () => {
      const user = readDB().users.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password)
      if (!user) throw new Error('Email or password is incorrect.')
      if (user.status === 'suspended') throw new Error('This account is suspended. Contact MarketLink support.')
      return { token: `local-${user.id}`, user: { ...user, password: undefined } }
    }),
    register: (payload) => localFirst('/auth/register', { method: 'POST', body: JSON.stringify(payload) }, () => {
      const db = readDB()
      if (db.users.some((item) => item.email.toLowerCase() === payload.email.toLowerCase())) throw new Error('An account with this email already exists.')
      const user = { id: uid('u'), ...payload, favorites: [], compareList: [], cart: [], farmerId: payload.role === 'farmer' ? uid('f') : undefined }
      db.users.push(user)
      if (payload.role === 'farmer') {
        db.farmers.push({
          id: user.farmerId, userId: user.id, name: payload.businessName, owner: payload.name,
          initials: payload.name.slice(0, 2).toUpperCase(), marketIds: [], rating: 0, reviews: 0,
          years: 0, status: 'pending', featured: false, bio: 'New to MarketLink.', specialties: [],
          pickup: [], liveLocation: payload.liveLocation || payload.address,
          lat: Number(payload.lat) || undefined, lng: Number(payload.lng) || undefined
        })
      }
      writeDB(db)
      return { token: `local-${user.id}`, user: { ...user, password: undefined } }
    }),
    getProfile: () => localFirst('/auth/profile', { method: 'GET' }, () => {
      const db = readDB()
      return db.users[0] || null
    }),
    updateProfile: (payload) => localFirst('/auth/profile', { method: 'PUT', body: JSON.stringify(payload) }, () => {
      const db = readDB()
      const user = db.users[0]
      if (user) {
        Object.assign(user, payload)
        writeDB(db)
      }
      return { user }
    }),
  },
  users: {
    toggleFavorite: (userId, itemId) => localFirst('/users/' + userId + '/favorites', { method: 'PATCH', body: JSON.stringify({ itemId }) }, () => {
      const db = readDB()
      const user = db.users.find((item) => item.id === userId)
      if (!user) throw new Error('Sign in to save favorites.')
      user.favorites ||= []
      user.favorites = user.favorites.includes(itemId) ? user.favorites.filter((id) => id !== itemId) : [...user.favorites, itemId]
      writeDB(db)
      return { ...user, password: undefined }
    }),
    getFavorites: (userId) => localFirst(`/users/${userId}/favorites`, { method: 'GET' }, () => {
      const user = readDB().users.find((item) => item.id === userId)
      return user?.favorites || []
    }),
    getCompare: (userId) => localFirst(`/users/${userId}/compare`, { method: 'GET' }, () => {
      const user = readDB().users.find((item) => item.id === userId)
      return { productIds: user?.compareList || [] }
    }),
    toggleCompare: (userId, productId) => localFirst(`/users/${userId}/compare`, { method: 'POST', body: JSON.stringify({ productId }) }, () => {
      const db = readDB()
      const user = db.users.find((item) => item.id === userId)
      if (user) {
        user.compareList ||= []
        user.compareList = user.compareList.includes(productId) ? user.compareList.filter(id => id !== productId) : [...user.compareList, productId]
        writeDB(db)
      }
      return { compareList: user?.compareList || [] }
    }),
    clearCompare: (userId) => localFirst(`/users/${userId}/compare`, { method: 'DELETE' }, () => {
      const db = readDB()
      const user = db.users.find((item) => item.id === userId)
      if (user) {
        user.compareList = []
        writeDB(db)
      }
      return { compareList: [] }
    }),
    getPreferences: (userId) => localFirst(`/users/${userId}/preferences`, { method: 'GET' }, () => {
      const user = readDB().users.find((item) => item.id === userId)
      return user?.preferences || { theme: 'light', notificationsEnabled: true }
    }),
    updatePreferences: (userId, prefs) => localFirst(`/users/${userId}/preferences`, { method: 'PUT', body: JSON.stringify(prefs) }, () => {
      const db = readDB()
      const user = db.users.find((item) => item.id === userId)
      if (user) {
        user.preferences = { ...user.preferences, ...prefs }
        writeDB(db)
      }
      return { preferences: user?.preferences }
    }),
  },
  products: {
    list: async () => {
      const items = await localFirst('/products', {}, () => readDB().products)
      return Array.isArray(items) ? items.map(p => ({ ...p, image: resolveFallbackImage(p) })) : items
    },
    get: async (id) => {
      const item = await localFirst(`/products/${id}`, {}, () => readDB().products.find((item) => item.id === id))
      return item ? { ...item, image: resolveFallbackImage(item) } : item
    },
    create: (payload) => localFirst('/products', { method: 'POST', body: JSON.stringify(payload) }, () => {
      const db = readDB()
      const farmer = db.farmers.find((item) => item.id === payload.farmerId)
      if (farmer?.status !== 'approved') throw new Error('Your farmer profile must be approved before publishing products.')
      const isFreshProduce = ['Vegetables', 'Fruit', 'Fruits'].includes(payload.category)
      const lastUpdatedMinutesAgo = 0
      const stockedThisMorning = isFreshProduce
      const expiresInHours = stockedThisMorning ? 24 : 0
      const item = { id: uid('p'), rating: 0, reviews: 0, harvestDaysAgo: 0, lastUpdatedMinutesAgo, recentlyRestocked: true, stockedThisMorning, expiresInHours, freshToday: isFreshProduce, freshWindow: stockedThisMorning, available: true, ...payload }
      db.products.unshift(item)
      writeDB(db)
      return item
    }),
    update: (id, payload) => localFirst(`/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, () => {
      const db = readDB()
      const index = db.products.findIndex((item) => item.id === id)
      if (index < 0) throw new Error('Product no longer exists.')
      const previous = db.products[index]
      const product = { ...previous, ...payload }
      if (product.stock !== undefined && (!Number.isInteger(product.stock) || product.stock < 0)) throw new Error('Stock must be a whole number, zero or more.')
      if (product.stock !== undefined) product.available = product.available && product.stock > 0
      if (product.available && (!previous.available || previous.stock <= 0 || (product.stock && product.stock > previous.stock))) {
        product.recentlyRestocked = true
        for (const subscription of db.stockSubscriptions || []) {
          if (subscription.productId === id) addNotification(db, subscription.userId, 'restock', product.name + ' is back in stock.', { productId: id })
        }
        db.stockSubscriptions = (db.stockSubscriptions || []).filter((item) => item.productId !== id)
      }
      db.products[index] = product
      writeDB(db)
      return product
    }),
    remove: (id) => localFirst(`/products/${id}`, { method: 'DELETE' }, () => {
      const db = readDB()
      db.products = db.products.filter((item) => item.id !== id)
      writeDB(db)
      return true
    }),
    getMyProducts: () => localFirst('/products/farmer/my-products', { method: 'GET' }, () => {
      const db = readDB()
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('marketlink_session') : null
      const user = token ? JSON.parse(token)?.user : null
      return db.products.filter((p) => p.farmerId === user?.farmerId || p.farmerId === user?.id)
    }),
  },
  markets: {
    list: () => localFirst('/markets', {}, () => readDB().markets),
    get: (id) => localFirst(`/markets/${id}`, {}, () => readDB().markets.find((item) => item.id === id)),
    getNearby: (lat, lng, radiusKm = 50) => localFirst(`/markets/nearby?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`, {}, () => readDB().markets),
    planRoute: (lat, lng, marketId) => localFirst('/markets/route-plan', { method: 'POST', body: JSON.stringify({ lat, lng, marketId }) }, () => {
      const market = readDB().markets.find(m => m.id === marketId)
      return { market, directions: { googleMapsUrl: `https://www.google.com/maps?q=${encodeURIComponent(market?.address || '')}` } }
    }),
    save: (payload) => localFirst(payload.id ? `/markets/${payload.id}` : '/markets', { method: payload.id ? 'PUT' : 'POST', body: JSON.stringify(payload) }, () => {
      const db = readDB()
      if (!payload.name?.trim() || !payload.address?.trim() || !payload.day?.trim() || !payload.openingTime || !payload.closingTime || payload.openingTime >= payload.closingTime || !Number.isFinite(payload.lat) || Math.abs(payload.lat) > 90 || !Number.isFinite(payload.lng) || Math.abs(payload.lng) > 180) throw new Error('Enter market details, valid coordinates, and a closing time after opening.')
      const existing = db.markets.find((item) => item.id === payload.id)
      const item = { ...existing, ...payload, id: existing?.id || uid('m'), mapUrl: payload.mapUrl || existing?.mapUrl || `https://www.google.com/maps?q=${payload.lat},${payload.lng}`, hours: payload.openingTime + ' - ' + payload.closingTime, date: existing?.date || 'Weekly', stalls: existing?.stalls || 0, description: existing?.description || 'Local market pickup point.' }
      if (existing) Object.assign(existing, item); else db.markets.push(item)
      writeDB(db)
      return item
    }),
    remove: (id) => localFirst(`/markets/${id}`, { method: 'DELETE' }, () => {
      const db = readDB()
      if (db.orders.some((order) => order.marketId === id && !['completed', 'cancelled', 'declined'].includes(order.status))) throw new Error('Complete or cancel active pickups before deleting this market.')
      db.markets = db.markets.filter((item) => item.id !== id)
      db.products.forEach((item) => { item.marketIds = item.marketIds.filter((marketId) => marketId !== id) })
      db.farmers.forEach((item) => { item.marketIds = item.marketIds.filter((marketId) => marketId !== id) })
      writeDB(db)
      return true
    }),
  },
  farmers: {
    list: (featuredOnly = false) => localFirst(featuredOnly ? '/farmers?featured=true' : '/farmers', {}, () => {
      const farmers = readDB().farmers
      return featuredOnly ? farmers.filter(f => f.featured) : farmers
    }),
    get: (id) => localFirst(`/farmers/${id}`, {}, () => readDB().farmers.find((item) => item.id === id)),
    getProfile: (id) => localFirst(`/farmers/profile/${id}`, {}, () => readDB().farmers.find((item) => item.id === id)),
    updateProfile: (id, payload) => localFirst(`/farmers/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, () => {
      const db = readDB()
      const farmer = db.farmers.find((item) => item.id === id)
      if (farmer) Object.assign(farmer, payload)
      writeDB(db)
      return farmer
    }),
    toggleFeatured: (id, featured) => localFirst(`/farmers/${id}/featured`, { method: 'PATCH', body: JSON.stringify({ featured }) }, () => {
      const db = readDB()
      const farmer = db.farmers.find((item) => item.id === id)
      if (farmer) farmer.featured = featured !== undefined ? featured : !farmer.featured
      writeDB(db)
      return farmer
    }),
    getOrders: () => localFirst('/farmers/orders', { method: 'GET' }, () => {
      const db = readDB()
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('marketlink_session') : null
      const user = token ? JSON.parse(token)?.user : null
      return db.orders.filter((o) => o.farmerId === user?.farmerId || o.farmerId === user?.id)
    }),
  },
  orders: {
    list: () => localFirst('/orders', {}, () => readDB().orders),
    get: (id) => localFirst(`/orders/${id}`, {}, () => readDB().orders.find((item) => item.id === id)),
    create: (payload) => localFirst('/orders', { method: 'POST', body: JSON.stringify(payload) }, () => reserveOrders(readDB(), payload)[0]),
    createBatch: (payload) => localFirst('/orders/batch', { method: 'POST', body: JSON.stringify(payload) }, () => reserveOrders(readDB(), payload)),
    updateStatus: (id, status) => localFirst(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }, () => {
      const db = readDB()
      const order = db.orders.find((item) => item.id === id)
      if (!order) throw new Error('Order not found.')
      const transitions = { placed: ['accepted', 'declined', 'cancelled'], accepted: ['preparing', 'ready', 'cancelled'], preparing: ['ready', 'cancelled'], ready: ['completed'] }
      if (!transitions[order.status]?.includes(status)) throw new Error('This order can no longer be changed to that status.')
      if (['declined', 'cancelled'].includes(status)) restoreStock(db, order)
      order.status = status
      if (['accepted', 'ready'].includes(status)) addNotification(db, order.customerId, status, 'Order ' + order.id + (status === 'accepted' ? ' was accepted by your farmer for ' : ' is ready for pickup at ') + order.pickupDate + ', ' + order.pickupSlot + '.', { orderId: order.id })
      writeDB(db)
      return order
    }),
    cancel: (id, reason = 'Cancelled') => localFirst(`/orders/${id}/cancel`, { method: 'PUT', body: JSON.stringify({ reason }) }, () => {
      const db = readDB()
      const order = db.orders.find((item) => item.id === id)
      if (!order) throw new Error('Order not found.')
      restoreStock(db, order)
      order.status = 'cancelled'
      writeDB(db)
      return { message: 'Order cancelled successfully', order }
    }),
  },
  reviews: {
    list: () => localFirst('/reviews', {}, () => readDB().reviews),
    getByProduct: (productId) => localFirst(`/reviews/product/${productId}`, {}, () => readDB().reviews.filter((r) => r.productId === productId)),
    getByFarmer: (farmerId) => localFirst(`/reviews/farmer/${farmerId}`, {}, () => readDB().reviews.filter((r) => r.farmerId === farmerId)),
    create: (payload) => localFirst('/reviews', { method: 'POST', body: JSON.stringify(payload) }, () => {
      const db = readDB()
      const order = db.orders.find((item) => item.id === payload.orderId)
      if (!order || order.customerId !== payload.customerId || order.status !== 'completed' || !order.items.some((item) => item.productId === payload.productId)) {
        throw new Error('Reviews require a completed order containing this product.')
      }
      if (db.reviews.some((item) => item.orderId === order.id && item.productId === payload.productId && item.customerId === payload.customerId)) {
        throw new Error('You have already reviewed this item.')
      }
      if (!Number.isInteger(payload.rating) || payload.rating < 1 || payload.rating > 5 || !payload.comment?.trim()) throw new Error('Choose a rating and enter a comment.')
      const review = { id: uid('r'), date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), ...payload }
      db.reviews.unshift(review)
      const product = db.products.find((item) => item.id === payload.productId)
      if (product) { product.rating = Number(((product.rating * product.reviews + payload.rating) / (product.reviews + 1)).toFixed(1)); product.reviews += 1 }
      writeDB(db)
      return review
    }),
    respond: (id, farmerId, response) => localFirst(`/reviews/${id}/respond`, { method: 'PATCH', body: JSON.stringify({ farmerId, response }) }, () => {
      const db = readDB()
      const review = db.reviews.find((item) => item.id === id)
      if (!review || !db.products.some((item) => item.id === review.productId && item.farmerId === farmerId) || !response.trim()) throw new Error('Enter a reply to a review on your product.')
      review.response = response.trim()
      writeDB(db)
      return review
    }),
    remove: (id) => localFirst(`/reviews/${id}`, { method: 'DELETE' }, () => {
      const db = readDB()
      db.reviews = db.reviews.filter((item) => item.id !== id)
      writeDB(db)
      return true
    }),
  },
  admin: {
    getDashboard: () => localFirst('/admin/dashboard', { method: 'GET' }, () => {
      const db = readDB()
      return {
        totalFarmers: db.farmers.length,
        totalCustomers: db.users.filter((u) => u.role === 'customer').length,
        totalMarkets: db.markets.length,
        totalOrders: db.orders.length,
        pendingFarmerApprovals: db.farmers.filter((f) => f.status === 'pending').length,
        totalRevenue: db.orders.reduce((sum, o) => sum + (o.total || 0), 0),
        recentOrders: db.orders.slice(0, 10),
      }
    }),
    getUsers: () => localFirst('/admin/users', { method: 'GET' }, () => readDB().users),
    updateFarmerStatus: (id, status, featured) => localFirst(`/admin/farmers/${id}`, { method: 'PATCH', body: JSON.stringify({ status, featured }) }, () => {
      const db = readDB()
      const farmer = db.farmers.find((item) => item.id === id)
      if (farmer) {
        if (status) farmer.status = status
        if (featured !== undefined) farmer.featured = featured
      }
      writeDB(db)
      return farmer
    }),
    toggleFarmerFeatured: (id, featured) => localFirst(`/admin/farmers/${id}/featured`, { method: 'PATCH', body: JSON.stringify({ featured }) }, () => {
      const db = readDB()
      const farmer = db.farmers.find((item) => item.id === id)
      if (farmer) farmer.featured = featured !== undefined ? featured : !farmer.featured
      writeDB(db)
      return farmer
    }),
    updateUserStatus: (id, status) => localFirst(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }, () => {
      const db = readDB()
      const user = db.users.find((item) => item.id === id)
      if (user) user.status = status
      writeDB(db)
      return user
    }),
    updateFarmerProfile: (id, payload) => localFirst(`/farmers/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }, () => {
      const db = readDB()
      const farmer = db.farmers.find((item) => item.id === id)
      if (!farmer) throw new Error('Farmer profile not found.')
      Object.assign(farmer, payload)
      writeDB(db)
      return farmer
    }),
  },
  categories: {
    list: () => localFirst('/categories', { method: 'GET' }, () => {
      const categories = [...new Set(readDB().products.map((product) => product.category).filter(Boolean))]
      return categories.map((name, i) => ({ id: `cat-${i+1}`, name }))
    }),
    create: (name, description = '') => localFirst('/categories', { method: 'POST', body: JSON.stringify({ name, description }) }, () => {
      return { id: `cat-${Date.now()}`, name }
    }),
    remove: (id) => localFirst(`/categories/${id}`, { method: 'DELETE' }, () => {
      return { message: 'Category deleted', success: true }
    }),
  },
  reports: {
    list: () => localFirst('/reports', { method: 'GET' }, () => []),
    generate: (reportType) => localFirst('/reports/generate', { method: 'POST', body: JSON.stringify({ reportType }) }, () => ({
      id: `rep-${Date.now()}`, reportType, createdAt: new Date().toISOString()
    })),
    downloadCSV: async (reportType) => {
      if (!API_URL) return null
      return remote(`/reports/export/${encodeURIComponent(reportType)}`)
    },
  },
  cart: {
    get: (userId) => localFirst(`/cart/${userId}`, { method: 'GET' }, () => {
      const user = readDB().users.find((u) => u.id === userId)
      return { items: user?.cart || [] }
    }),
    save: (userId, items) => localFirst(`/cart/${userId}`, { method: 'POST', body: JSON.stringify({ items }) }, () => {
      const db = readDB()
      const user = db.users.find((u) => u.id === userId)
      if (user) {
        user.cart = items
        writeDB(db)
      }
      return { cart: items }
    }),
    clear: (userId) => localFirst(`/cart/${userId}`, { method: 'DELETE' }, () => {
      const db = readDB()
      const user = db.users.find((u) => u.id === userId)
      if (user) {
        user.cart = []
        writeDB(db)
      }
      return { success: true }
    }),
  },
  ai: {
    chat: (message, history = []) => localFirst('/ai/chat', { method: 'POST', body: JSON.stringify({ message, history }) }, () => ({
      reply: "MarketLink AI: Local growers harvest weekly. Reserve your items and collect in person!",
      suggestions: ['Check market schedule', 'View vegetables', 'How does reservation work?']
    })),
    suggestions: () => localFirst('/ai/suggestions', { method: 'GET' }, () => [
      'What markets are open this Saturday?',
      'Show me fresh organic vegetables',
      'How do I reserve and pay for my basket?'
    ]),
  },
  notifications: {
    list: (userId) => localFirst(userId ? `/users/${userId}/notifications` : '/notifications', {}, () => {
      const db = readDB()
      return userId ? db.notifications.filter((item) => item.userId === userId) : db.notifications
    }),
    markRead: (id) => localFirst(`/notifications/${id}`, { method: 'PATCH', body: JSON.stringify({ unread: false }) }, () => {
      const db = readDB()
      const item = db.notifications.find((entry) => entry.id === id)
      if (item) item.unread = false
      writeDB(db)
      return item
    }),
    markAllRead: (userId) => localFirst(`/users/${userId}/notifications/read-all`, { method: 'PATCH' }, () => {
      const db = readDB()
      db.notifications.forEach((item) => { if (item.userId === userId) item.unread = false })
      writeDB(db)
      return true
    }),
    push: (userId, type, text, details = {}) => localFirst('/notifications', { method: 'POST', body: JSON.stringify({ userId, type, text, ...details }) }, () => {
      const db = readDB()
      const notification = { id: uid('n'), userId, type, text, unread: true, createdAt: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }), ...details }
      db.notifications.unshift(notification)
      writeDB(db)
      return notification
    }),
    create: (payload) => localFirst('/notifications', { method: 'POST', body: JSON.stringify(payload) }, () => {
      const db = readDB()
      const notification = { id: uid('n'), unread: true, createdAt: new Date().toLocaleString('en-GB'), ...payload }
      db.notifications.unshift(notification)
      writeDB(db)
      return notification
    }),
  },
  subscriptions: {
    notifyMe: (userId, productId) => localFirst('/subscriptions', { method: 'POST', body: JSON.stringify({ userId, productId }) }, () => {
      const db = readDB()
      db.stockSubscriptions ||= []
      if (!db.stockSubscriptions.some((item) => item.userId === userId && item.productId === productId)) {
        db.stockSubscriptions.push({ userId, productId })
      }
      writeDB(db)
      return true
    }),
    list: () => localFirst('/subscriptions', { method: 'GET' }, () => readDB().stockSubscriptions || []),
  },
  announcements: {
    publish: (text) => localFirst('/announcements', { method: 'POST', body: JSON.stringify({ text }) }, () => {
      const db = readDB()
      db.users.filter((user) => user.role === 'customer').forEach((user) => addNotification(db, user.id, 'announcement', text))
      writeDB(db)
      return { success: true }
    }),
  },
  snapshot: () => readDB(),
}

export default api
