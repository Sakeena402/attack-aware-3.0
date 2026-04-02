# CyberAwareSim - Frontend Setup

## Project Structure

```
app/
├── (auth)/              # Authentication routes
│   ├── login/          # Login page
│   └── register/       # Registration page
├── dashboard/          # Protected dashboard routes
│   ├── page.tsx        # Dashboard home
│   ├── leaderboard/    # Leaderboard page
│   ├── analytics/      # Analytics page
│   ├── campaigns/      # Campaign management
│   └── layout.tsx      # Dashboard layout
├── context/            # React Context API
│   └── authContext.tsx # Authentication context
├── page.tsx            # Landing page
├── layout.tsx          # Root layout
└── globals.css         # Global styles

components/
├── ui/                 # shadcn/ui components
└── dashboard/          # Dashboard components
    ├── sidebar.tsx     # Navigation sidebar
    └── header.tsx      # Header with theme toggle
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
# or
pnpm install
# or
yarn install
```

### 2. Set Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 3. Run Development Server

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Features

### Authentication
- Login/Register with email and password
- JWT-based authentication
- Protected routes
- Role-based access control (Super Admin, Admin, Employee)
- Context API for state management

### Landing Page
- Hero section with CTA
- Features showcase
- Pricing plans
- Statistics
- How it works section

### Dashboard
- Role-based dashboard views
- Statistics and metrics
- Recent activity feed
- Quick stats with progress bars

### Leaderboard
- Department-based rankings
- Employee scores and badges
- Trend indicators
- Filter by department

### Analytics
- Click rate charts
- Trend analysis
- Response distribution pie chart
- Key metrics and trending data

## Technologies Used

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **Tailwind CSS 4** - Styling
- **TypeScript** - Type safety
- **Lucide React** - Icons
- **Recharts** - Charts and graphs
- **shadcn/ui** - UI components

## Key Components

### AuthContext
Manages authentication state with useReducer pattern:
- Login/Register/Logout
- Token management
- User state persistence
- Error handling

### Dashboard Components
- **Sidebar**: Navigation with collapsible menu
- **Header**: User info, notifications, theme toggle
- **Stat Cards**: Key metrics display
- **Charts**: Analytics visualization

## Styling

The app uses a cybersecurity-themed dark mode design:
- Color scheme: Deep navy (#0F172A) and cyber purple (#7C3AED)
- Dark/Light mode support
- Glassmorphic cards
- Smooth animations with Tailwind CSS

## API Integration

The frontend connects to the Node.js/Express backend at:
```
http://localhost:5000
```

Main API endpoints:
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `GET /api/campaigns/company/:companyId` - Get campaigns
- `GET /api/leaderboard/company/:companyId` - Get leaderboard
- `GET /api/analytics/company/:companyId` - Get analytics

## Environment Variables

### Development
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Production (Vercel)
Set in Vercel project settings:
```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

## Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

```bash
# Or use Vercel CLI
vercel deploy
```

## Testing Login

**Demo Credentials:**
- Email: `admin@cyberaware.com`
- Password: `password123`

## Troubleshooting

### API Connection Issues
- Ensure backend is running on `http://localhost:5000`
- Check CORS settings in backend
- Verify `NEXT_PUBLIC_API_URL` is correct

### Authentication Issues
- Clear localStorage: `localStorage.clear()`
- Check browser console for errors
- Verify JWT token in network requests

### Styling Issues
- Clear Next.js cache: `rm -rf .next`
- Restart dev server
- Check Tailwind CSS configuration

## Next Steps

1. Connect to real MongoDB database
2. Implement actual API calls for campaigns and analytics
3. Add WebSocket for real-time updates
4. Implement email notifications
5. Add export/reporting features
6. Set up CI/CD pipeline

## Support

For issues or questions, check:
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
