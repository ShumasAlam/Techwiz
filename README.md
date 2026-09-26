# MarketLink 🌾🛒

Connecting local farmers directly with conscious consumers.

## 📁 Project Structure

```text
MarketLink/
├── Backend/          # Express.js REST API, Mongoose Models, MongoDB Atlas connection
└── Frontend/         # React + Vite application, Tailwind CSS, Lucide Icons
```

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd Backend
npm install
```
Configure your `Backend/.env` file:
```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
NODE_ENV=development
```

Seed database:
```bash
npm run seed
```

Start backend:
```bash
npm start
```

### 2. Frontend Setup
```bash
cd Frontend
npm install
npm run dev
```

---

## 🛠️ Tech Stack
- **Frontend:** React 19, Vite, Tailwind CSS, Lucide Icons, React Router
- **Backend:** Node.js, Express, Mongoose, JWT, Bcrypt, Multer
- **Database:** MongoDB Atlas
