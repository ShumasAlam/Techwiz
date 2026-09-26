# 📋 MarketLink Backend — Complete API Documentation

**Base URL:** `https://techwiz-backend-gold.vercel.app`

---

## 🟢 1. Health / Status

### `GET /`
> Server status check

**Response:**
```json
{ "message": "MarketLink API Server Running" }
```

### `GET /api/health`
> Detailed health check

**Response:**
```json
{
  "status": "ok",
  "message": "MarketLink API Server is running",
  "database": "connected",
  "timestamp": "2026-09-26T14:00:00.000Z"
}
```

---

## 🔐 2. Auth (`/api/auth`)

### `POST /api/auth/register`
> Register a new user

**Payload:**
```json
{
  "name": "Ali Khan",
  "username": "alikhan",
  "email": "ali@example.com",
  "password": "mypassword123",
  "role": "customer",
  "phone": "03001234567",
  "address": "Islamabad, Pakistan",
  "businessName": "Ali Farms"
}
```
> `role` = `"customer"` | `"farmer"` | `"admin"`
> `businessName` only needed if `role` = `"farmer"`

**Response (201):**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "u-m1abc123",
    "name": "Ali Khan",
    "email": "ali@example.com",
    "role": "customer",
    "phone": "03001234567",
    "address": "Islamabad, Pakistan",
    "farmerId": null,
    "favorites": [],
    "status": "active"
  }
}
```

---

### `POST /api/auth/login`
> Login with email & password

**Payload:**
```json
{
  "email": "customer@marketlink.demo",
  "password": "demo123"
}
```

**Demo Accounts:**
| Role | Email | Password |
|------|-------|----------|
| Customer | `customer@marketlink.demo` | `demo123` |
| Farmer | `farmer@marketlink.demo` | `demo123` |
| Admin | `admin@marketlink.demo` | `demo123` |

**Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "u-demo-customer",
    "name": "Demo Customer",
    "email": "customer@marketlink.demo",
    "role": "customer",
    "phone": "0300-1234567",
    "address": "Islamabad",
    "farmerId": null,
    "favorites": [],
    "status": "active"
  }
}
```

---

### `GET /api/auth/profile`
> Get current user's profile

**🔒 Auth:** `Authorization: Bearer <token>`

**Response (200):** Full User object (without password)

---

### `PUT /api/auth/profile`
> Update current user's profile

**🔒 Auth:** `Authorization: Bearer <token>`

**Payload:**
```json
{
  "name": "Updated Name",
  "phone": "03009876543",
  "address": "Lahore, Pakistan",
  "favorites": ["p-abc123"]
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "u-demo-customer",
    "name": "Updated Name",
    "email": "customer@marketlink.demo",
    "role": "customer",
    "phone": "03009876543",
    "address": "Lahore, Pakistan",
    "farmerId": null,
    "favorites": ["p-abc123"],
    "status": "active"
  }
}
```

---

## 🥕 3. Products (`/api/products`)

### `GET /api/products`
> Get all products

**Response (200):**
```json
[
  {
    "id": "p-demo-tomatoes",
    "farmerId": "f-demo-farmer",
    "marketIds": ["m-demo-market"],
    "name": "Fresh Tomatoes",
    "category": "Vegetables",
    "subcategory": "",
    "comparisonGroup": "",
    "price": 120,
    "unit": "kg",
    "stock": 50,
    "available": true,
    "image": "",
    "badge": "Fresh",
    "description": "Farm-fresh tomatoes",
    "rating": 4.5,
    "reviews": 10,
    "harvestDaysAgo": 0,
    "lastUpdatedMinutesAgo": 0,
    "distanceKm": 0,
    "pickupWindow": "",
    "recentlyRestocked": false,
    "seasonal": false,
    "popular": true,
    "freshToday": true
  }
]
```

---

### `GET /api/products/:id`
> Get a single product by ID

**URL Params:** `id` = product ID (e.g. `p-demo-tomatoes`)

**Response (200):** Single product object

---

### `POST /api/products`
> Create a new product

**🔒 Auth:** `Authorization: Bearer <token>` (farmer role required)

**Payload:**
```json
{
  "farmerId": "f-demo-farmer",
  "marketIds": ["m-demo-market"],
  "name": "Organic Potatoes",
  "category": "Vegetables",
  "subcategory": "Root",
  "price": 80,
  "unit": "kg",
  "stock": 100,
  "badge": "Organic",
  "description": "Fresh organic potatoes",
  "distanceKm": 5,
  "pickupWindow": "8 AM - 2 PM"
}
```
> Image upload: send as `multipart/form-data` with field name `image`

**Response (201):** Created product object

---

### `PUT /api/products/:id`
> Update a product

**🔒 Auth:** `Authorization: Bearer <token>` (farmer/admin role)

**Payload:** Same fields as create (only send fields you want to update)
```json
{
  "price": 90,
  "stock": 150
}
```

**Response (200):** Updated product object

---

### `DELETE /api/products/:id`
> Delete a product

**🔒 Auth:** `Authorization: Bearer <token>` (farmer/admin role)

**Response (200):**
```json
{ "message": "Product deleted successfully", "success": true }
```

---

### `GET /api/products/farmer/my-products`
> Get logged-in farmer's own products

**🔒 Auth:** `Authorization: Bearer <token>` (farmer role)

**Response (200):** Array of product objects

---

## 📦 4. Orders (`/api/orders`)

### `POST /api/orders`
> Create a new order

**Payload:**
```json
{
  "customerId": "u-demo-customer",
  "marketId": "m-demo-market",
  "pickupDate": "28 Sep 2026",
  "pickupSlot": "8:00 AM - 10:00 AM",
  "items": [
    { "productId": "p-demo-tomatoes", "quantity": 2 },
    { "productId": "p-demo-potatoes", "quantity": 3 }
  ]
}
```

**Response (201):**
```json
{
  "id": "ML-4823",
  "customerId": "u-demo-customer",
  "farmerId": "f-demo-farmer",
  "marketId": "m-demo-market",
  "pickupDate": "28 Sep 2026",
  "pickupSlot": "8:00 AM - 10:00 AM",
  "status": "placed",
  "total": 480,
  "items": [
    { "productId": "p-demo-tomatoes", "name": "Fresh Tomatoes", "price": 120, "quantity": 2 },
    { "productId": "p-demo-potatoes", "name": "Organic Potatoes", "price": 80, "quantity": 3 }
  ]
}
```

---

### `POST /api/orders/batch`
> Create multiple orders at once (same payload as above, auto-groups by farmer)

**Payload:** Same as `POST /api/orders`

**Response (201):** Array of order objects

---

### `GET /api/orders`
> Get all orders

**Response (200):**
```json
[
  {
    "id": "ML-4823",
    "customerId": "u-demo-customer",
    "farmerId": "f-demo-farmer",
    "marketId": "m-demo-market",
    "pickupDate": "28 Sep 2026",
    "pickupSlot": "8:00 AM - 10:00 AM",
    "status": "placed",
    "createdAt": "26 Sep 2026",
    "total": 480,
    "items": [...]
  }
]
```

---

### `GET /api/orders/:id`
> Get a single order by ID

**Response (200):** Single order object

---

### `PATCH /api/orders/:id` or `PUT /api/orders/:id`
> Update order status

**Payload:**
```json
{ "status": "accepted" }
```

**Valid status transitions:**
| Current | Allowed Next |
|---------|-------------|
| `placed` | `accepted`, `declined`, `cancelled` |
| `accepted` | `preparing`, `ready`, `ready_for_pickup`, `cancelled` |
| `preparing` | `ready`, `ready_for_pickup`, `cancelled` |
| `ready` | `completed` |
| `ready_for_pickup` | `completed` |

**Response (200):** Updated order object

---

### `PUT /api/orders/:id/cancel`
> Cancel an order (restores stock)

**Payload (optional):**
```json
{ "reason": "Changed my mind" }
```

**Response (200):**
```json
{ "message": "Order cancelled successfully", "order": { ... } }
```

---

## 🏪 5. Markets (`/api/markets`)

### `GET /api/markets`
> Get all markets

**Response (200):**
```json
[
  {
    "id": "m-demo-market",
    "name": "Sunday Farmers Market",
    "day": "Sunday",
    "date": "Weekly",
    "hours": "8:00 AM — 2:00 PM",
    "openingTime": "8:00 AM",
    "closingTime": "2:00 PM",
    "address": "F-7 Markaz, Islamabad",
    "distance": "2.5 km",
    "stalls": 25,
    "lat": 33.7294,
    "lng": 73.0631,
    "description": "Weekly farmers market"
  }
]
```

---

### `GET /api/markets/nearby`
> Get nearby markets

**Query Params:** `?lat=33.72&lng=73.06` or `?latitude=33.72&longitude=73.06`

**Response (200):** Array of market objects

---

### `GET /api/markets/:id`
> Get a single market

**Response (200):** Single market object

---

### `POST /api/markets`
> Create a new market

**Payload:**
```json
{
  "name": "Saturday Market",
  "day": "Saturday",
  "date": "Weekly",
  "openingTime": "9:00 AM",
  "closingTime": "3:00 PM",
  "address": "G-9 Markaz, Islamabad",
  "distance": "4 km",
  "stalls": 15,
  "lat": 33.71,
  "lng": 73.04,
  "description": "New weekend market"
}
```
> Image upload: `multipart/form-data` with field `image`

**Response (201):** Created market object

---

### `PUT /api/markets/:id`
> Update a market (same payload, only changed fields)

**Response (200):** Updated market object

---

### `DELETE /api/markets/:id`
> Delete a market (fails if active orders exist)

**Response (200):**
```json
{ "message": "Market deleted successfully", "success": true }
```

---

## ⭐ 6. Reviews (`/api/reviews`)

### `GET /api/reviews`
> Get all reviews

**Response (200):**
```json
[
  {
    "id": "r-abc123",
    "productId": "p-demo-tomatoes",
    "farmerId": "f-demo-farmer",
    "orderId": "ML-4823",
    "customerId": "u-demo-customer",
    "customer": "Demo Customer",
    "rating": 5,
    "comment": "Great quality tomatoes!",
    "response": "",
    "date": "26 Sep 2026"
  }
]
```

---

### `POST /api/reviews`
> Create a review (requires completed order)

**Payload:**
```json
{
  "orderId": "ML-4823",
  "productId": "p-demo-tomatoes",
  "customerId": "u-demo-customer",
  "rating": 5,
  "comment": "Great quality tomatoes!",
  "customer": "Demo Customer"
}
```
> `rating` must be 1-5, `comment` is required

**Response (201):** Created review object

---

### `PUT /api/reviews/:id/respond` or `PATCH /api/reviews/:id/respond`
> Farmer responds to a review

**Payload:**
```json
{ "response": "Thank you for your kind words!" }
```

**Response (200):** Updated review object

---

### `DELETE /api/reviews/:id`
> Delete a review

**Response (200):**
```json
{ "message": "Review deleted successfully", "success": true }
```

---

### `GET /api/reviews/product/:productId`
> Get all reviews for a specific product

**Response (200):** Array of review objects

---

### `GET /api/reviews/farmer/:farmerId`
> Get all reviews for a specific farmer

**Response (200):** Array of review objects

---

## 🧑‍🌾 7. Farmers (`/api/farmers`)

### `GET /api/farmers`
> Get all farmers

**Response (200):**
```json
[
  {
    "id": "f-demo-farmer",
    "userId": "u-demo-farmer",
    "name": "Green Valley Farm",
    "owner": "Demo Farmer",
    "initials": "GV",
    "marketIds": ["m-demo-market"],
    "rating": 4.5,
    "reviews": 12,
    "years": 5,
    "status": "approved",
    "bio": "Fresh produce from our family farm",
    "specialties": ["Vegetables", "Fruits"],
    "pickup": ["Sunday 8AM-2PM"]
  }
]
```

---

### `GET /api/farmers/:id`
> Get farmer by ID

**Response (200):** Single farmer object

---

### `GET /api/farmers/profile/:id`
> Same as above (alias)

---

### `PUT /api/farmers/profile` or `PUT /api/farmers/:id` or `PATCH /api/farmers/:id`
> Update farmer profile

**Payload:**
```json
{
  "name": "Updated Farm Name",
  "bio": "We grow the best organic produce",
  "specialties": ["Organic Vegetables"],
  "marketIds": ["m-demo-market"],
  "pickup": ["Saturday 9AM-3PM"]
}
```

**Response (200):** Updated farmer object

---

### `GET /api/farmers/orders`
> Get orders for the logged-in farmer

**Response (200):** Array of order objects

---

## 🛡️ 8. Admin (`/api/admin`)

### `GET /api/admin/dashboard`
> Get admin dashboard stats

**Response (200):**
```json
{
  "totalFarmers": 5,
  "totalCustomers": 20,
  "totalMarkets": 3,
  "totalOrders": 50,
  "pendingFarmerApprovals": 2,
  "totalRevenue": 45000,
  "recentOrders": [...]
}
```

---

### `GET /api/admin/users`
> Get all users (without passwords)

**Response (200):** Array of user objects

---

### `PATCH /api/admin/farmers/:id` or `PUT /api/admin/farmers/:id`
> Approve/reject a farmer

**Payload:**
```json
{ "status": "approved" }
```
> `status` = `"approved"` | `"pending"` | `"rejected"` | `"suspended"`

**Response (200):** Updated farmer object

---

### `PATCH /api/admin/users/:id` or `PUT /api/admin/users/:id`
> Update user status (activate/suspend)

**Payload:**
```json
{ "status": "suspended" }
```

**Response (200):** Updated user object

---

## 🔔 9. Notifications (`/api/notifications`)

### `GET /api/notifications`
> Get all notifications (filter by `?userId=xxx`)

**Query Params:** `?userId=u-demo-customer` (optional)

**Response (200):**
```json
[
  {
    "id": "n-abc123",
    "userId": "u-demo-customer",
    "type": "reminder",
    "text": "Pickup reminder: collect ML-4823 at Sunday Market...",
    "unread": true,
    "createdAt": "26/09/2026, 14:00:00",
    "orderId": "ML-4823",
    "productId": null
  }
]
```

---

### `POST /api/notifications`
> Create a notification

**Payload:**
```json
{
  "userId": "u-demo-customer",
  "type": "system",
  "text": "Welcome to MarketLink!",
  "orderId": null,
  "productId": null
}
```
> `type` = `"reminder"` | `"restock"` | `"accepted"` | `"ready"` | `"system"` | `"announcement"`

**Response (201):** Created notification object

---

### `PATCH /api/notifications/:id` or `PUT /api/notifications/:id`
> Mark notification as read/unread

**Payload (optional):**
```json
{ "unread": false }
```

**Response (200):** Updated notification object

---

## 👤 10. Users (`/api/users`)

### `PATCH /api/users/:userId/favorites`
> Toggle a favorite item

**Payload:**
```json
{ "itemId": "p-demo-tomatoes" }
```

**Response (200):**
```json
{
  "id": "u-demo-customer",
  "name": "Demo Customer",
  "email": "customer@marketlink.demo",
  "role": "customer",
  "favorites": ["p-demo-tomatoes"],
  "phone": "0300-1234567",
  "address": "Islamabad",
  "status": "active"
}
```

---

### `GET /api/users/:userId/favorites`
> Get user's favorites list

**Response (200):**
```json
["p-demo-tomatoes", "p-demo-potatoes"]
```

---

### `GET /api/users/:userId/notifications`
> Get notifications for a specific user

**Response (200):** Array of notification objects

---

### `PATCH /api/users/:userId/notifications/read-all`
> Mark all notifications as read

**Response (200):**
```json
{ "message": "All notifications marked as read", "success": true }
```

---

## 📬 11. Subscriptions (`/api/subscriptions`)

### `POST /api/subscriptions`
> Subscribe to restock notification for an out-of-stock product

**Payload:**
```json
{
  "userId": "u-demo-customer",
  "productId": "p-demo-tomatoes"
}
```

**Response (200):**
```json
{ "message": "Subscribed to restock notification", "success": true }
```

---

### `GET /api/subscriptions`
> Get all active subscriptions

**Response (200):**
```json
[
  { "userId": "u-demo-customer", "productId": "p-demo-tomatoes" }
]
```

---

## 📢 12. Announcements (`/api/announcements`)

### `POST /api/announcements`
> Publish announcement to all customers

**Payload:**
```json
{ "text": "New market opening this Saturday!" }
```

**Response (200):**
```json
{ "message": "Announcement published successfully", "count": 20 }
```

---

## 📸 13. Snapshot (`/api/snapshot`)

### `GET /api/snapshot`
> Get full database snapshot (used by frontend to sync)

**Response (200):**
```json
{
  "users": [...],
  "markets": [...],
  "farmers": [...],
  "products": [...],
  "reviews": [...],
  "orders": [...],
  "notifications": [...],
  "stockSubscriptions": [...]
}
```

---

## 📊 Summary Table

| # | Resource | Method | Endpoint | Auth | Has Payload? |
|---|----------|--------|----------|------|-------------|
| 1 | Health | `GET` | `/` | ✗ | ✗ |
| 2 | Health | `GET` | `/api/health` | ✗ | ✗ |
| 3 | Auth | `POST` | `/api/auth/register` | ✗ | ✔ |
| 4 | Auth | `POST` | `/api/auth/login` | ✗ | ✔ |
| 5 | Auth | `GET` | `/api/auth/profile` | ✔ | ✗ |
| 6 | Auth | `PUT` | `/api/auth/profile` | ✔ | ✔ |
| 7 | Products | `GET` | `/api/products` | ✗ | ✗ |
| 8 | Products | `GET` | `/api/products/:id` | ✗ | ✗ |
| 9 | Products | `POST` | `/api/products` | ✔ farmer | ✔ |
| 10 | Products | `PUT` | `/api/products/:id` | ✔ farmer/admin | ✔ |
| 11 | Products | `DELETE` | `/api/products/:id` | ✔ farmer/admin | ✗ |
| 12 | Products | `GET` | `/api/products/farmer/my-products` | ✔ farmer | ✗ |
| 13 | Orders | `POST` | `/api/orders` | ✗ | ✔ |
| 14 | Orders | `POST` | `/api/orders/batch` | ✗ | ✔ |
| 15 | Orders | `GET` | `/api/orders` | ✗ | ✗ |
| 16 | Orders | `GET` | `/api/orders/:id` | ✗ | ✗ |
| 17 | Orders | `PATCH` | `/api/orders/:id` | ✗ | ✔ |
| 18 | Orders | `PUT` | `/api/orders/:id/cancel` | ✗ | ✔ |
| 19 | Markets | `GET` | `/api/markets` | ✗ | ✗ |
| 20 | Markets | `GET` | `/api/markets/nearby?lat=&lng=` | ✗ | ✗ |
| 21 | Markets | `GET` | `/api/markets/:id` | ✗ | ✗ |
| 22 | Markets | `POST` | `/api/markets` | ✗ | ✔ |
| 23 | Markets | `PUT` | `/api/markets/:id` | ✗ | ✔ |
| 24 | Markets | `DELETE` | `/api/markets/:id` | ✗ | ✗ |
| 25 | Reviews | `GET` | `/api/reviews` | ✗ | ✗ |
| 26 | Reviews | `POST` | `/api/reviews` | ✗ | ✔ |
| 27 | Reviews | `PUT` | `/api/reviews/:id/respond` | ✗ | ✔ |
| 28 | Reviews | `DELETE` | `/api/reviews/:id` | ✗ | ✗ |
| 29 | Reviews | `GET` | `/api/reviews/product/:productId` | ✗ | ✗ |
| 30 | Reviews | `GET` | `/api/reviews/farmer/:farmerId` | ✗ | ✗ |
| 31 | Farmers | `GET` | `/api/farmers` | ✗ | ✗ |
| 32 | Farmers | `GET` | `/api/farmers/:id` | ✗ | ✗ |
| 33 | Farmers | `PUT` | `/api/farmers/:id` | ✗ | ✔ |
| 34 | Farmers | `GET` | `/api/farmers/orders` | ✗ | ✗ |
| 35 | Admin | `GET` | `/api/admin/dashboard` | ✗ | ✗ |
| 36 | Admin | `GET` | `/api/admin/users` | ✗ | ✗ |
| 37 | Admin | `PATCH` | `/api/admin/farmers/:id` | ✗ | ✔ |
| 38 | Admin | `PATCH` | `/api/admin/users/:id` | ✗ | ✔ |
| 39 | Notifications | `GET` | `/api/notifications?userId=` | ✗ | ✗ |
| 40 | Notifications | `POST` | `/api/notifications` | ✗ | ✔ |
| 41 | Notifications | `PATCH` | `/api/notifications/:id` | ✗ | ✔ |
| 42 | Users | `PATCH` | `/api/users/:userId/favorites` | ✗ | ✔ |
| 43 | Users | `GET` | `/api/users/:userId/favorites` | ✗ | ✗ |
| 44 | Users | `GET` | `/api/users/:userId/notifications` | ✗ | ✗ |
| 45 | Users | `PATCH` | `/api/users/:userId/notifications/read-all` | ✗ | ✗ |
| 46 | Subscriptions | `POST` | `/api/subscriptions` | ✗ | ✔ |
| 47 | Subscriptions | `GET` | `/api/subscriptions` | ✗ | ✗ |
| 48 | Announcements | `POST` | `/api/announcements` | ✗ | ✔ |
| 49 | Snapshot | `GET` | `/api/snapshot` | ✗ | ✗ |

---

## 🔑 Authentication Header

For protected endpoints, add this header:
```
Authorization: Bearer <token>
```

Get the token from the login response.
