# CyberAwareSim - Cybersecurity Awareness Training Platform

A professional, enterprise-grade MERN stack SaaS platform for training employees against social engineering attacks including phishing, smishing, and vishing with interactive simulations and real-time analytics.

## 🎯 Overview

CyberAwareSim is a comprehensive cybersecurity awareness training platform designed to help organizations protect their employees from social engineering attacks. The platform includes:

- **Interactive Simulations**: Phishing, smishing, and vishing attack simulations
- **Real-time Analytics**: Comprehensive dashboards and analytics
- **Gamification**: Leaderboards and badges to boost engagement
- **Role-Based Access**: Super Admin, Admin, and Employee roles
- **Professional UI**: Modern, glassmorphic design with dark mode support

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- Next.js 16 with App Router
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui components
- Recharts for analytics
- Context API for state management

**Backend:**
- Node.js + Express.js
- MongoDB Atlas (cloud database)
- JWT authentication
- bcryptjs for password hashing

**Deployment:**
- Frontend: Vercel
- Backend: Heroku, AWS, or DigitalOcean

## 📦 Project Structure

```
cyberaware-sim/
├── app/                          # Next.js frontend
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/
│   │   ├── leaderboard/
│   │   ├── analytics/
│   │   └── campaigns/
│   ├── context/
│   │   └── authContext.tsx
│   ├── page.tsx                 # Landing page
│   └── layout.tsx
├── components/
│   ├── ui/                       # shadcn/ui components
│   └── dashboard/
│       ├── sidebar.tsx
│       └── header.tsx
├── server/                        # Express backend
│   ├── models/                   # MongoDB schemas
│   ├── controllers/              # Business logic
│   ├── routes/                   # API endpoints
│   ├── middleware/               # Auth middleware
│   ├── config/                   # Database config
│   ├── scripts/                  # Database seeding
│   └── server.js
├── FRONTEND_SETUP.md
├── README.md                     # This file
└── .env.example
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm/pnpm
- MongoDB Atlas account
- Git

### 1. Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd cyberaware-sim

# Install frontend dependencies
npm install
# or pnpm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 2. Configure Environment Variables

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

**Backend (server/.env):**
```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cyberaware?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRE=24h
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

### 3. Set Up MongoDB

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (free tier)
4. Get your connection string
5. Update `MONGODB_URI` in `server/.env`

### 4. Seed Database (Backend)

```bash
cd server
npm run seed
```

This creates:
- 1 super admin user (admin@cyberaware.com / password123)
- 2 sample companies
- Multiple employees and campaigns
- Sample simulation data

### 5. Run Both Services

**Terminal 1 - Frontend (port 3000):**
```bash
npm run dev
```

**Terminal 2 - Backend (port 5000):**
```bash
cd server
npm run dev
```

### 6. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## 🔐 Demo Credentials

- **Email**: admin@cyberaware.com
- **Password**: password123
- **Role**: Admin (can create campaigns and view analytics)

## 📊 Key Features

### 1. **Public Website**
- Professional landing page with hero section
- Features showcase
- Pricing plans
- Call-to-action sections

### 2. **Authentication**
- Secure registration and login
- JWT token-based authentication
- Password hashing with bcryptjs
- Protected routes with role-based access

### 3. **Dashboards**

#### Super Admin Dashboard
- Manage all companies
- View global statistics
- Manage admins and users
- Global analytics

#### Company Admin Dashboard
- Create and manage campaigns
- Track employee progress
- View company analytics
- Manage team members

#### Employee Dashboard
- Personal progress tracking
- Training modules
- Leaderboard position
- Recent activity feed

### 4. **Campaigns & Simulations**
- Create phishing simulations
- Smishing (SMS-based) attacks
- Vishing (voice-based) attacks
- Track employee responses
- Real-time statistics

### 5. **Analytics**
- Click rate analysis
- Report rate tracking
- Department performance
- Trend analysis
- Response distribution charts

### 6. **Leaderboard**
- Department-based rankings
- Employee scores
- Badge system (Novice, Aware, Expert, Guardian)
- Gamification elements
- Historical trends

## 🔄 API Endpoints

### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
```

### Companies
```
POST   /api/companies
GET    /api/companies
GET    /api/companies/:id
PUT    /api/companies/:id
DELETE /api/companies/:id
```

### Campaigns
```
POST   /api/campaigns
GET    /api/campaigns/:id
GET    /api/campaigns/company/:companyId
PUT    /api/campaigns/:id
DELETE /api/campaigns/:id
```

### Analytics
```
POST   /api/analytics/simulation
GET    /api/analytics/campaign/:campaignId
GET    /api/analytics/company/:companyId
GET    /api/analytics/global/stats
```

### Leaderboard
```
POST   /api/leaderboard/:companyId/update
GET    /api/leaderboard/company/:companyId
GET    /api/leaderboard/:companyId/department/:dept
```

## 🎨 Design System

### Color Palette
- **Primary**: Deep Navy (#0F172A)
- **Secondary**: Cyber Purple (#7C3AED)
- **Accent**: Electric Blue (#6366F1)
- **Background**: Dark gradients

### Typography
- **Headings**: Poppins (600, 700 weights)
- **Body**: Inter (400, 500 weights)

### UI Components
- Glassmorphic cards
- Smooth animations
- Responsive layouts
- Dark/Light mode support

## 🔒 Security Features

- Password hashing with bcrypt (10 salt rounds)
- JWT authentication (24-hour expiry)
- Role-based access control (RBAC)
- Input validation and sanitization
- Protected API endpoints
- CORS configuration
- Environment variable protection

## 📈 Scalability Considerations

- MongoDB indexes for performance
- Pagination for large datasets
- Caching strategies ready
- Stateless API design
- Horizontal scaling ready
- Database connection pooling

## 🚢 Deployment

### Frontend Deployment (Vercel)

```bash
# Using Vercel CLI
npm install -g vercel
vercel login
vercel

# Or connect GitHub repo and auto-deploy
```

### Backend Deployment (Heroku)

```bash
# Create Heroku app
heroku create cyberaware-api
heroku config:set MONGODB_URI=...
heroku config:set JWT_SECRET=...
git push heroku main
```

### Environment Variables for Production

**Vercel (Frontend):**
- `NEXT_PUBLIC_API_URL=https://your-api-domain.com`

**Heroku (Backend):**
- `MONGODB_URI=mongodb+srv://...`
- `JWT_SECRET=strong-random-key`
- `NODE_ENV=production`
- `CLIENT_URL=https://your-frontend-domain.com`

## 📚 Documentation

- **Frontend Setup**: See [FRONTEND_SETUP.md](./FRONTEND_SETUP.md)
- **Backend Setup**: See [server/README.md](./server/README.md)

## 🐛 Troubleshooting

### API Connection Error
```
Check:
1. Backend is running on port 5000
2. NEXT_PUBLIC_API_URL is correct
3. CORS is enabled
4. Network tab in browser console
```

### Database Connection Error
```
Check:
1. MongoDB URI is correct
2. IP whitelist in MongoDB Atlas
3. Network connectivity
4. Database name exists
```

### Authentication Issues
```
Clear cache:
- localStorage.clear() in browser console
- Restart development servers
- Check JWT token expiration
```

## 📋 Feature Checklist

### Phase 1: Foundation ✅
- [x] Backend setup with Express and MongoDB
- [x] Frontend with Next.js and React
- [x] Authentication system (JWT)
- [x] Database schemas and models

### Phase 2: Core Features ✅
- [x] Landing page
- [x] Login/Register pages
- [x] Dashboard layouts
- [x] Campaign management API
- [x] Analytics API
- [x] Leaderboard system

### Phase 3: Frontend UI ✅
- [x] Dashboard components
- [x] Analytics charts
- [x] Leaderboard display
- [x] Navigation sidebar
- [x] Dark mode support

### Phase 4: Future Enhancements
- [ ] Email notifications
- [ ] WebSocket for real-time updates
- [ ] Advanced reporting and exports
- [ ] API documentation (Swagger)
- [ ] Unit and integration tests
- [ ] Custom training materials upload
- [ ] Mobile app
- [ ] Single Sign-On (SSO)

## 🤝 Contributing

This is a demonstration project. To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use this project as a foundation for your own.

## 🆘 Support & Resources

- **Next.js**: https://nextjs.org/docs
- **Express.js**: https://expressjs.com
- **MongoDB**: https://docs.mongodb.com
- **Tailwind CSS**: https://tailwindcss.com
- **shadcn/ui**: https://ui.shadcn.com

## 📞 Contact

For questions or issues with the demo, please create an issue in the repository.

---

**Made with ❤️ for enterprise cybersecurity**

**Version**: 1.0.0
**Last Updated**: 2024
