import { cloneSeedData } from './mockData'
import { uid } from '../utils/helpers'

const DB_KEY = 'marketlink_demo_db_v1'
const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '')

const wait = (value, delay = 50) => new Promise((resolve) => setTimeout(() => resolve(value), delay))

const readDB = () => {
  try {
    const stored = localStorage.getItem(DB_KEY)
    if (stored) {
      const db = JSON.parse(stored)
      if (!db.tripCatalogVersion) {
        const seed = cloneSeedData()
        for (const product of seed.products.filter((item) => Number(item.id.slice(2)) >= 30)) {
          if (!db.products.some((item) => item.id === product.id)) db.products.push(product)
        }
        db.products.forEach((product) => {
          if (product.comparisonGroup === 'eggs') product.category = 'Eggs'
          if (product.id === 'p-14') { product.name = 'Fresh Spinach'; product.description = 'Tender local spinach for everyday cooking.' }
          if (!['Vegetables', 'Fruit', 'Fruits'].includes(product.category)) {
            product.freshToday = false
            if (product.badge === 'Picked today') product.badge = 'Market favourite'
          }
        })
        db.notifications?.forEach((item) => { item.text = item.text.replaceAll('Organic Spinach', 'Fresh Spinach') })
        db.tripCatalogVersion = 1
        localStorage.setItem(DB_KEY, JSON.stringify(db))
      }
      return db
    }
  } catch { /* self-heal below */ }
  const fresh = cloneSeedData()
  localStorage.setItem(DB_KEY, JSON.stringify(fresh))
  return fresh
}

const writeDB = (data) => {
  localStorage.setItem(DB_KEY, JSON.stringify(data))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('marketlink:data'))
  }
  return data
}

// Background sync from MongoDB Atlas via /snapshot
let syncInProgress = false
const syncWithBackend = async () => {
  if (syncInProgress || typeof window === 'undefined' || !API_URL) return
  syncInProgress = true
  try {
    const token = localStorage.getItem('marketlink_token')
    const response = await fetch(`${API_URL}/snapshot`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    })
    if (response.ok) {
      const serverData = await response.json()
      if (serverData && serverData.products && serverData.markets) {
        const current = readDB()
        const merged = {
          ...current,
          ...serverData,
          tripCatalogVersion: 1
        }
        writeDB(merged)
      }
    }
  } catch {
    // Offline or server not yet started: keep using local cache
  } finally {
    syncInProgress = false
  }
}

// Initial sync on app load
if (typeof window !== 'undefined' && API_URL) {
  setTimeout(syncWithBackend, 200)
}

const remote = async (path, options = {}) => {
  if (!API_URL) throw new Error('Local demo mode')
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('marketlink_token') : null
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  })
  if (!response.ok) {
    let errorMsg = `Request failed: ${response.status}`
    try {
      const data = await response.json()
      if (data.message) errorMsg = data.message
    } catch { /* ignore */ }
    const error = new Error(errorMsg)
    error.status = response.status
    throw error
  }
  return response.json()
}

const localFirst = async (path, options, fallback) => {
  if (!API_URL) return wait(fallback ? fallback() : null)
  try {
    const result = await remote(path, options)
    setTimeout(syncWithBackend, 100)
    return result
  } catch (error) {
    if (error.status && error.status >= 400 && error.status < 500) {
      throw error
    }
    const localResult = fallback ? fallback() : null
    return wait(localResult)
  }
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
  mode: API_URL ? 'connected' : 'demo',
  sync: syncWithBackend,
  resetDemo: () => { const fresh = cloneSeedData(); writeDB(fresh); return wait(fresh) },

  // ==========================================
  // 1. HEALTH / STATUS
  // ==========================================
  health: {
    check: () => localFirst('/health', { method: 'GET' }, () => ({ status: 'ok', database: 'connected' })),
  },

  // ==========================================
  // 2. AUTHENTICATION
  // ==========================================
  auth: {
    login: (email, password) => localFirst('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, () => {
      const user = readDB().users.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password)
      if (!user) throw new Error('Email or password is incorrect.')
      if (user.status === 'suspended') throw new Error('This account is suspended. Contact MarketLink support.')
      return { token: `demo-${user.id}`, user: { ...user, password: undefined } }
    }),
    register: (payload) => localFirst('/auth/register', { method: 'POST', body: JSON.stringify(payload) }, () => {
      const db = readDB()
      if (db.users.some((item) => item.email.toLowerCase() === payload.email.toLowerCase())) throw new Error('An account with this email already exists.')
      const user = { id: uid('u'), ...payload, favorites: [], farmerId: payload.role === 'farmer' ? uid('f') : undefined }
      db.users.push(user)
      if (payload.role === 'farmer') db.farmers.push({ id: user.farmerId, userId: user.id, name: payload.businessName, owner: payload.name, initials: payload.name.slice(0, 2).toUpperCase(), marketIds: [], rating: 0, reviews: 0, years: 0, status: 'pending', bio: 'New to MarketLink.', specialties: [], pickup: [] })
      writeDB(db)
      return { token: `demo-${user.id}`, user: { ...user, password: undefined } }
    }),
    getProfile: () => localFirst('/auth/profile', { method: 'GET' }, () => {
      const token = localStorage.getItem('marketlink_token')
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

  // ==========================================
  // 3. USERS
  // ==========================================
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
    getNotifications: (userId) => localFirst(`/users/${userId}/notifications`, { method: 'GET' }, () => {
      return readDB().notifications.filter((item) => item.userId === userId)
    }),
    markAllRead: (userId) => localFirst(`/users/${userId}/notifications/read-all`, { method: 'PATCH' }, () => {
      const db = readDB()
      db.notifications.forEach((item) => { if (item.userId === userId) item.unread = false })
      writeDB(db)
      return true
    }),
  },

  // ==========================================
  // 4. PRODUCTS
  // ==========================================
  products: {
    list: () => localFirst('/products', {}, () => readDB().products),
    get: (id) => localFirst(`/products/${id}`, {}, () => readDB().products.find((item) => item.id === id)),
    create: (payload) => localFirst('/products', { method: 'POST', body: JSON.stringify(payload) }, () => {
      const db = readDB()
      const farmer = db.farmers.find((item) => item.id === payload.farmerId)
      if (farmer?.status !== 'approved') throw new Error('Your farmer profile must be approved before publishing products.')
      const item = { id: uid('p'), rating: 0, reviews: 0, available: true, ...payload }
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

  // ==========================================
  // 5. ORDERS
  // ==========================================
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
      if (['accepted', 'ready'].includes(status)) addNotification(db, order.customerId, status, 'Order ' + order.id + (status === 'accepted' ? ' was accepted by your farmer.' : ' is ready for pickup.'), { orderId: order.id })
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

  // ==========================================
  // 6. MARKETS
  // ==========================================
  markets: {
    list: () => localFirst('/markets', {}, () => readDB().markets),
    get: (id) => localFirst(`/markets/${id}`, {}, () => readDB().markets.find((item) => item.id === id)),
    getNearby: (lat, lng) => localFirst(`/markets/nearby?lat=${lat}&lng=${lng}`, {}, () => readDB().markets),
    create: (payload) => localFirst('/markets', { method: 'POST', body: JSON.stringify(payload) }, () => {
      const db = readDB()
      const item = { id: uid('m'), ...payload }
      db.markets.push(item)
      writeDB(db)
      return item
    }),
    update: (id, payload) => localFirst(`/markets/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, () => {
      const db = readDB()
      const existing = db.markets.find((item) => item.id === id)
      if (existing) Object.assign(existing, payload)
      writeDB(db)
      return existing
    }),
    save: (payload) => {
      const db = readDB()
      if (!payload.name?.trim() || !payload.address?.trim() || !payload.day?.trim() || !payload.openingTime || !payload.closingTime || payload.openingTime >= payload.closingTime || !Number.isFinite(payload.lat) || Math.abs(payload.lat) > 90 || !Number.isFinite(payload.lng) || Math.abs(payload.lng) > 180) throw new Error('Enter market details, valid coordinates, and a closing time after opening.')
      const existing = db.markets.find((item) => item.id === payload.id)
      const item = { ...existing, ...payload, id: existing?.id || uid('m'), hours: payload.openingTime + ' - ' + payload.closingTime, date: existing?.date || 'Weekly', stalls: existing?.stalls || 0, description: existing?.description || 'Local market pickup point.' }
      if (existing) Object.assign(existing, item); else db.markets.push(item)
      writeDB(db)
      if (API_URL) {
        remote(payload.id ? `/markets/${payload.id}` : '/markets', { method: payload.id ? 'PUT' : 'POST', body: JSON.stringify(payload) }).catch(() => {})
      }
      return item
    },
    remove: (id) => {
      const db = readDB()
      if (db.orders.some((order) => order.marketId === id && !['completed', 'cancelled', 'declined'].includes(order.status))) throw new Error('Complete or cancel active pickups before deleting this market.')
      db.markets = db.markets.filter((item) => item.id !== id)
      db.products.forEach((item) => { item.marketIds = item.marketIds.filter((marketId) => marketId !== id) })
      db.farmers.forEach((item) => { item.marketIds = item.marketIds.filter((marketId) => marketId !== id) })
      writeDB(db)
      if (API_URL) {
        remote(`/markets/${id}`, { method: 'DELETE' }).catch(() => {})
      }
    },
  },

  // ==========================================
  // 7. REVIEWS
  // ==========================================
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
    respond: (id, farmerId, response) => {
      const db = readDB()
      const review = db.reviews.find((item) => item.id === id)
      if (!review || !db.products.some((item) => item.id === review.productId && item.farmerId === farmerId) || !response.trim()) throw new Error('Enter a reply to a review on your product.')
      review.response = response.trim()
      writeDB(db)
      if (API_URL) {
        remote(`/reviews/${id}/respond`, { method: 'PUT', body: JSON.stringify({ response, farmerId }) }).catch(() => {})
      }
      return review
    },
    remove: (id) => {
      const db = readDB()
      db.reviews = db.reviews.filter((item) => item.id !== id)
      writeDB(db)
      if (API_URL) {
        remote(`/reviews/${id}`, { method: 'DELETE' }).catch(() => {})
      }
    },
  },

  // ==========================================
  // 8. FARMERS
  // ==========================================
  farmers: {
    list: () => localFirst('/farmers', {}, () => readDB().farmers),
    get: (id) => localFirst(`/farmers/${id}`, {}, () => readDB().farmers.find((item) => item.id === id)),
    getProfile: (id) => localFirst(`/farmers/profile/${id}`, {}, () => readDB().farmers.find((item) => item.id === id)),
    updateProfile: (id, payload) => localFirst(`/farmers/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, () => {
      const db = readDB()
      const farmer = db.farmers.find((item) => item.id === id)
      if (farmer) Object.assign(farmer, payload)
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

  // ==========================================
  // 9. ADMIN
  // ==========================================
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
    updateFarmerStatus: (id, status) => localFirst(`/admin/farmers/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }, () => {
      const db = readDB()
      const farmer = db.farmers.find((item) => item.id === id)
      if (farmer) farmer.status = status
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
  },

  // ==========================================
  // 10. NOTIFICATIONS
  // ==========================================
  notifications: {
    list: (userId) => localFirst(userId ? `/notifications?userId=${userId}` : '/notifications', {}, () => {
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
    create: (payload) => localFirst('/notifications', { method: 'POST', body: JSON.stringify(payload) }, () => {
      const db = readDB()
      const notification = { id: uid('n'), unread: true, createdAt: new Date().toLocaleString('en-GB'), ...payload }
      db.notifications.unshift(notification)
      writeDB(db)
      return notification
    }),
    push: (userId, type, text, details = {}) => {
      const db = readDB()
      const notification = { id: uid('n'), userId, type, text, unread: true, createdAt: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }), ...details }
      db.notifications.unshift(notification)
      writeDB(db)
      if (API_URL) {
        remote('/notifications', { method: 'POST', body: JSON.stringify({ userId, type, text, ...details }) }).catch(() => {})
      }
      return notification
    },
  },

  // ==========================================
  // 11. SUBSCRIPTIONS
  // ==========================================
  subscriptions: {
    notifyMe: (userId, productId) => {
      const db = readDB()
      db.stockSubscriptions ||= []
      if (!db.stockSubscriptions.some((item) => item.userId === userId && item.productId === productId)) {
        db.stockSubscriptions.push({ userId, productId })
      }
      writeDB(db)
      if (API_URL) {
        remote('/subscriptions', { method: 'POST', body: JSON.stringify({ userId, productId }) }).catch(() => {})
      }
      return true
    },
    list: () => localFirst('/subscriptions', { method: 'GET' }, () => readDB().stockSubscriptions || []),
  },

  // ==========================================
  // 12. ANNOUNCEMENTS
  // ==========================================
  announcements: {
    publish: (text) => {
      const db = readDB()
      db.users.filter((user) => user.role === 'customer').forEach((user) => addNotification(db, user.id, 'announcement', text))
      writeDB(db)
      if (API_URL) {
        remote('/announcements', { method: 'POST', body: JSON.stringify({ text }) }).catch(() => {})
      }
    },
  },

  // ==========================================
  // 13. SNAPSHOT
  // ==========================================
  snapshot: () => readDB(),
}

export default api
