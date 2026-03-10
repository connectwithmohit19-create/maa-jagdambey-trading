# Maa Jagdambey Trading — Business Management System v4.0

Electronics & Appliances Wholesale · Lucknow, UP

---

## 🗂️ What's Included

| Phase | Features |
|-------|----------|
| Phase 1 | Dashboard, Products, Customers |
| Phase 2 | Orders, GST Invoices, Payments |
| Phase 3 | Employee Management, Attendance, Salary |
| Phase 4 | Reports, Customer Portal, WhatsApp Alerts, Railway Deploy |

---

## 🚀 Quick Start (Local Development)

### 1. Set up Neon DB

1. Go to [neon.tech](https://neon.tech) → Sign up (free) → Create project
2. In SQL Editor, run these files **in order**:
   - `server/schema.sql` (creates all tables + seed data)
   - `server/schema_phase2.sql` (auto order numbers)
   - `server/schema_phase4.sql` (portal fields + WhatsApp log)
3. Copy your connection string from Neon dashboard

### 2. Configure Backend

```bash
cd server
cp ../.env.example .env
# Edit .env and fill:
#   DATABASE_URL = your Neon connection string
#   JWT_SECRET = any random 32+ char string
#   CUSTOMER_JWT_SECRET = another random 32+ char string
#   PORT = 5000
npm install
npm run dev
# API runs at http://localhost:5000
```

### 3. Start Frontend

```bash
cd client
npm install
npm run dev
# App runs at http://localhost:5173
```

### 4. Login

- **Admin**: http://localhost:5173/login
  - Username: `admin` · Password: `admin123`
- **Customer Portal**: http://localhost:5173/portal/login
  - Set credentials from admin panel (Customers → Portal Access)

---

## ☁️ Deploy to Railway (Backend)

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Push this repo to GitHub first, then connect it
3. Set environment variables in Railway dashboard:
   ```
   DATABASE_URL     = (your Neon URL)
   JWT_SECRET       = (strong random string)
   CUSTOMER_JWT_SECRET = (another random string)
   NODE_ENV         = production
   CLIENT_URL       = (your frontend URL)
   ```
4. Railway auto-detects `railway.json` and deploys from `server/`
5. Your API will be at: `https://your-app.railway.app`

## 🌐 Deploy Frontend (Vercel — Free)

1. Go to [vercel.com](https://vercel.com) → New Project → Import GitHub repo
2. **Root directory**: `client`
3. **Build command**: `npm run build`
4. **Output directory**: `dist`
5. Add environment variable:
   ```
   VITE_API_URL = https://your-app.railway.app
   ```
6. Update `client/vite.config.js` proxy target to your Railway URL

---

## 📲 WhatsApp Setup (Meta Business API)

### Step 1: Create Meta App
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create App → Business → Add "WhatsApp" product
3. Get your **Phone Number ID** and **Temporary Access Token**
4. For production, generate a **Permanent System User Token**

### Step 2: Register Message Templates
Templates must be approved by Meta before sending. Submit these in **WhatsApp Manager → Message Templates**:

| Template Name | Category | Sample |
|---|---|---|
| `mjt_order_confirmed` | Utility | "Dear {{1}}, your order {{2}} worth {{3}} has been confirmed. Balance: {{4}}" |
| `mjt_payment_received` | Utility | "Dear {{1}}, payment of {{2}} received for order {{3}}. Balance: {{4}}" |
| `mjt_balance_reminder` | Utility | "Dear {{1}}, your outstanding balance with {{3}} is {{2}}. Please contact {{4}} to clear." |
| `mjt_low_stock_alert` | Utility | "⚠️ Low Stock Alert: {{1}} has only {{2}} units left. SKU: {{3}}" |

### Step 3: Add to .env
```
META_PHONE_NUMBER_ID = your_number_id
META_WA_ACCESS_TOKEN = your_access_token
ADMIN_WHATSAPP_NUMBER = 919876543210
LOW_STOCK_THRESHOLD = 3
```

### Automated Alerts
- **Balance Reminders**: Auto-sent every **Monday at 9:00 AM IST** to all customers with balance > 0
- **Low Stock**: Auto-triggered whenever a product stock falls at or below `LOW_STOCK_THRESHOLD`

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| Backend | Node.js, Express.js |
| Database | Neon DB (PostgreSQL, serverless) |
| Auth | JWT (separate tokens for admin + customers) |
| WhatsApp | Meta Business Cloud API |
| Cron | node-cron |
| Hosting | Railway (backend) + Vercel (frontend) |

---

## 📁 Project Structure

```
maa-jagdambey-trading/
├── client/                    # React frontend
│   └── src/
│       ├── pages/
│       │   ├── portal/        # Customer portal pages
│       │   └── ...            # Admin pages
│       ├── components/        # Layout, Sidebar, Modal
│       ├── context/           # AuthContext
│       └── lib/api.js         # All API calls
├── server/                    # Node.js backend
│   ├── routes/                # All API routes
│   ├── services/
│   │   └── whatsapp.js        # Meta WhatsApp service
│   ├── middleware/
│   │   ├── auth.js            # Admin JWT middleware
│   │   └── customerAuth.js    # Customer JWT middleware
│   ├── schema.sql             # Run first (all tables)
│   ├── schema_phase2.sql      # Run second (auto numbering)
│   ├── schema_phase4.sql      # Run third (portal + WA log)
│   └── index.js               # Server entry point
├── railway.json               # Railway deploy config
├── nixpacks.toml              # Railway build config
├── .env.example               # Copy to .env
└── README.md
```

---

## 🔑 Default Credentials

> **Change these immediately after first login!**

- Admin username: `admin`
- Admin password: `admin123`

---

## 💰 Running Costs

| Service | Cost |
|---|---|
| Neon DB (free tier) | ₹0/month |
| Railway (within free credits) | ₹0/month |
| Vercel (frontend, free tier) | ₹0/month |
| WhatsApp (first 1000 conversations) | ₹0/month |
| **Total** | **₹0/month effectively** |

