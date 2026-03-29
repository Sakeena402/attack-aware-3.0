# CyberAwareSim - Quick Start Guide

## ⚡ 30-Second Setup

### 1. Install & Configure
```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Create .env files
echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > .env.local

cd server
cat > .env << EOF
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cyberaware?retryWrites=true&w=majority
JWT_SECRET=change_this_to_random_string_in_production
JWT_EXPIRE=24h
NODE_ENV=development
CLIENT_URL=http://localhost:3000
EOF
cd ..
```

### 2. Seed Database
```bash
cd server
npm run seed
cd ..
```

### 3. Start Everything
```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend (in server directory)
npm run dev
```

### 4. Access
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **Email**: admin@cyberaware.com
- **Password**: password123

---

## 🎯 Common Commands

### Frontend Development
```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production build
npm start

# Lint code
npm run lint
```

### Backend Development
```bash
cd server

# Start dev server
npm run dev

# Start production server
npm start

# Seed database
npm run seed
```

### Database Management
```bash
cd server

# Seed sample data
npm run seed

# Connect to MongoDB (need MongoDB CLI)
mongosh "mongodb+srv://username:password@cluster.mongodb.net/cyberaware"
```

---

## 🔑 Important Files

| File | Purpose |
|------|---------|
| `.env.local` | Frontend API URL |
| `server/.env` | Backend configuration |
| `app/context/authContext.tsx` | Authentication state |
| `app/page.tsx` | Landing page |
| `app/dashboard/page.tsx` | Dashboard home |
| `server/server.js` | Express app entry point |
| `server/models/*.js` | MongoDB schemas |

---

## 🔗 API Base URLs

- **Development**: `http://localhost:5000`
- **Production**: `https://your-api-domain.com`

---

## 👤 Test Users

Created by seeding script:

| Email | Password | Role |
|-------|----------|------|
| admin@cyberaware.com | password123 | Super Admin |
| admin1@techcorp.com | password123 | Admin |
| admin2@financehub.com | password123 | Admin |
| Employee accounts | password123 | Employee |

---

## 📁 Project Structure

```
Frontend (Next.js)
├── app/(auth)/          # Login, Register
├── app/dashboard/       # Protected routes
├── components/          # React components
├── context/            # Auth context
├── page.tsx            # Landing page
└── layout.tsx          # Root layout

Backend (Express)
├── models/             # MongoDB schemas
├── controllers/        # Business logic
├── routes/            # API endpoints
├── middleware/        # Auth & validation
├── config/            # Database
└── server.js          # App entry
```

---

## 🚀 Deployment Quick Links

### Frontend (Vercel)
1. Push to GitHub
2. Connect to Vercel
3. Set `NEXT_PUBLIC_API_URL` env var
4. Deploy!

### Backend (Heroku)
```bash
heroku create cyberaware-api
heroku config:set MONGODB_URI=...
heroku config:set JWT_SECRET=...
git push heroku main
```

---

## 🐛 Troubleshooting

### "Cannot connect to API"
```bash
# Check if backend is running
curl http://localhost:5000/health

# Check .env.local has correct URL
cat .env.local
```

### "MongoDB connection error"
- Verify `MONGODB_URI` in `server/.env`
- Check IP whitelist in MongoDB Atlas
- Ensure credentials are correct

### "Port already in use"
```bash
# Change port in server/.env
PORT=5001

# Or kill process using port
lsof -ti:5000 | xargs kill -9
```

### "Clear cache and start fresh"
```bash
# Frontend
rm -rf .next
npm run dev

# Backend
rm -rf node_modules
npm install
npm run dev
```

---

## 📖 Documentation Files

- **README.md** - Full project overview
- **FRONTEND_SETUP.md** - Frontend documentation
- **IMPLEMENTATION_GUIDE.md** - Complete setup guide
- **PROJECT_SUMMARY.md** - What's been built
- **server/README.md** - Backend documentation

---

## ✅ Features Checklist

- [x] Landing page with marketing content
- [x] User registration and login
- [x] JWT authentication
- [x] Role-based dashboards (Super Admin, Admin, Employee)
- [x] Campaign management system
- [x] Simulation result tracking
- [x] Real-time analytics
- [x] Leaderboard with rankings
- [x] Dark/Light mode
- [x] Responsive design
- [x] Database seeding
- [x] Comprehensive documentation

---

## 🎨 Customization

### Change Colors
Edit `app/globals.css` CSS variables:
```css
:root {
  --primary: 15 23 42;           /* Navy blue */
  --secondary: 139 92 246;       /* Purple */
  --accent: 99 102 241;          /* Blue */
}
```

### Change Fonts
Edit `app/layout.tsx`:
```typescript
import { YourFont } from 'next/font/google'
const yourFont = YourFont({ subsets: ['latin'] })
```

### Change Brand Name
Search and replace "CyberAwareSim" throughout codebase

---

## 🔒 Security Reminders

- [ ] Change `JWT_SECRET` to strong random value
- [ ] Don't commit `.env` files to git
- [ ] Use HTTPS in production
- [ ] Enable MongoDB IP whitelist
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS for production URL
- [ ] Use strong passwords for MongoDB Atlas
- [ ] Enable 2FA on MongoDB Atlas account

---

## 📞 Getting Help

### Check Logs
```bash
# Frontend errors
npm run dev  # Check console output

# Backend errors
cd server && npm run dev  # Check console output

# Heroku logs
heroku logs --tail
```

### Debug Mode
```bash
# Enable verbose logging
DEBUG=* npm run dev
```

---

## 🎯 Next Steps

1. **Customize** branding and colors
2. **Add** email notifications
3. **Setup** real-time updates with WebSocket
4. **Deploy** to production
5. **Monitor** with error tracking
6. **Scale** with load balancing
7. **Integrate** with your systems

---

## 📝 Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Backend (server/.env)
```
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret_key
JWT_EXPIRE=24h
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

---

## 🏃 Daily Workflow

```bash
# Start day
cd cyberaware-sim
npm run dev &
cd server && npm run dev

# Make changes
# Edit files

# Test changes
# Visit http://localhost:3000

# Deploy
git push
# Automatic deployment via Vercel & Heroku
```

---

## ✨ Quick Wins

Implement these first for immediate impact:
1. Add email notifications on campaign launch
2. Add user profile picture upload
3. Add export analytics to PDF
4. Add campaign templates
5. Add auto-save for campaign drafts

---

**Happy Building! 🚀**

For detailed info, see the full documentation files.
