# CyberAwareSim - Backend API

A robust Node.js/Express REST API for the CyberAwareSim cybersecurity awareness platform.

## Project Structure

```
server/
├── config/
│   └── database.js           # MongoDB connection
├── models/
│   ├── User.js               # User schema
│   ├── Company.js            # Company schema
│   ├── Campaign.js           # Campaign schema
│   ├── SimulationResult.js   # Simulation results
│   ├── Leaderboard.js        # Leaderboard data
│   └── ContactMessage.js     # Contact form submissions
├── controllers/
│   ├── authController.js     # Auth logic
│   ├── companyController.js  # Company logic
│   ├── campaignController.js # Campaign logic
│   ├── analyticsController.js # Analytics logic
│   ├── leaderboardController.js # Leaderboard logic
│   └── contactController.js  # Contact logic
├── routes/
│   ├── auth.js               # Auth endpoints
│   ├── company.js            # Company endpoints
│   ├── campaign.js           # Campaign endpoints
│   ├── analytics.js          # Analytics endpoints
│   ├── leaderboard.js        # Leaderboard endpoints
│   └── contact.js            # Contact endpoints
├── middleware/
│   └── auth.js               # JWT auth middleware
├── utils/
│   ├── jwt.js                # JWT utilities
│   ├── errorHandler.js       # Error handling
│   └── validators.js         # Input validation
├── scripts/
│   └── seedData.js           # Sample data seeding
├── server.js                 # Main server file
├── package.json              # Dependencies
├── .env.example              # Environment template
└── README.md                 # This file
```

## Setup Instructions

### 1. Prerequisites

- Node.js 16+ installed
- npm or yarn package manager
- MongoDB Atlas account or local MongoDB instance

### 2. Install Dependencies

```bash
cd server
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the server directory:

```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cyberaware?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRE=24h
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

**MongoDB Atlas Setup:**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster
4. Get connection string and replace `username:password` with your credentials
5. Add `cyberaware` database name or use default

### 4. Seed Sample Data

```bash
npm run seed
```

This populates the database with:
- 1 Super Admin user
- 2 Companies with Admins
- 8 Employees per company
- 3 Campaigns per company
- Simulation results and leaderboard data

**Demo Login Credentials:**
- Email: `admin@cyberaware.com`
- Password: `password123`

### 5. Start Development Server

```bash
npm run dev
```

Server runs on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Companies
- `POST /api/companies` - Create company (protected)
- `GET /api/companies` - Get all companies (super_admin only)
- `GET /api/companies/:companyId` - Get company details
- `PUT /api/companies/:companyId` - Update company
- `DELETE /api/companies/:companyId` - Delete company

### Campaigns
- `POST /api/campaigns` - Create campaign (admin only)
- `GET /api/campaigns/:campaignId` - Get campaign details
- `GET /api/campaigns/company/:companyId` - Get company campaigns
- `PUT /api/campaigns/:campaignId` - Update campaign (admin only)
- `DELETE /api/campaigns/:campaignId` - Delete campaign (admin only)

### Analytics
- `POST /api/analytics/simulation` - Record simulation result
- `GET /api/analytics/campaign/:campaignId` - Get campaign analytics
- `GET /api/analytics/company/:companyId` - Get company analytics
- `GET /api/analytics/global/stats` - Get global statistics (super_admin only)

### Leaderboard
- `POST /api/leaderboard/:companyId/update` - Update leaderboard
- `GET /api/leaderboard/company/:companyId` - Get company leaderboard
- `GET /api/leaderboard/company/:companyId/user/:userId` - Get user position
- `GET /api/leaderboard/:companyId/department/:department` - Get department leaderboard

### Contact
- `POST /api/contact` - Submit contact form
- `GET /api/contact` - Get all messages (super_admin only)
- `PATCH /api/contact/:messageId/read` - Mark message as read
- `DELETE /api/contact/:messageId` - Delete message

## Authentication

### JWT Token
- Tokens expire in 24 hours
- Include in request header: `Authorization: Bearer <token>`
- Stored in `localStorage` on frontend

### Role-Based Access Control
- **super_admin**: Full platform access
- **admin**: Company management and analytics
- **employee**: Personal dashboard and training

## Models

### User
```javascript
{
  name: String,
  email: String (unique),
  passwordHash: String (bcrypt),
  role: 'super_admin' | 'admin' | 'employee',
  companyId: ObjectId,
  department: String,
  points: Number,
  badge: String,
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date
}
```

### Campaign
```javascript
{
  campaignName: String,
  type: 'phishing' | 'smishing' | 'vishing',
  description: String,
  createdBy: ObjectId (User),
  companyId: ObjectId,
  status: 'draft' | 'active' | 'completed' | 'paused',
  targetDepartments: [String],
  emailOpened: Number,
  linkClicked: Number,
  credentialsSubmitted: Number,
  reportedPhishing: Number,
  startDate: Date,
  endDate: Date
}
```

### SimulationResult
```javascript
{
  userId: ObjectId,
  campaignId: ObjectId,
  companyId: ObjectId,
  emailOpened: Boolean,
  linkClicked: Boolean,
  credentialsSubmitted: Boolean,
  reportedPhishing: Boolean,
  result: 'safe' | 'clicked' | 'compromised' | 'reported',
  points: Number,
  timestamp: Date
}
```

## Security Features

- **Password Hashing**: bcryptjs with salt rounds 10
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Server-side validation on all inputs
- **CORS**: Configured for frontend origin
- **Rate Limiting**: Ready for implementation
- **Environment Variables**: Sensitive data in .env

## Error Handling

All endpoints return consistent error format:
```json
{
  "success": false,
  "message": "Error description"
}
```

Success responses:
```json
{
  "success": true,
  "message": "Success message",
  "data": { /* response data */ }
}
```

## Middleware

### protect
Verifies JWT token and adds user to request:
```javascript
router.get('/api/protected', protect, handler)
```

### authorize
Checks user role:
```javascript
router.get('/api/admin', protect, authorize('admin', 'super_admin'), handler)
```

## Database Queries

### Find user with campaigns
```javascript
await User.findById(userId).populate('campaigns')
```

### Get company employees
```javascript
await User.find({ companyId, role: 'employee' })
```

### Calculate leaderboard
```javascript
await Leaderboard.find({ companyId }).sort({ score: -1 })
```

## Performance Tips

- Add database indexes on frequently queried fields
- Implement caching for analytics queries
- Use pagination for large result sets
- Consider query optimization with projections

## Deployment

### Heroku
```bash
heroku create cyberaware-api
heroku config:set MONGODB_URI=...
heroku config:set JWT_SECRET=...
git push heroku main
```

### AWS/Digital Ocean
1. Set environment variables on server
2. Install dependencies
3. Run `npm start`
4. Use PM2 for process management

```bash
npm install -g pm2
pm2 start server.js --name "cyberaware-api"
pm2 startup
pm2 save
```

## Testing

### Test login endpoint
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cyberaware.com","password":"password123"}'
```

### Test protected route
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### MongoDB Connection Error
- Verify MONGODB_URI in .env
- Check IP whitelist in MongoDB Atlas
- Ensure database name is correct

### JWT Issues
- Check JWT_SECRET is set
- Verify token format in Authorization header
- Check token expiration time

### CORS Errors
- Ensure CLIENT_URL matches frontend URL
- Check browser console for exact error
- Verify origin in CORS configuration

## Environment Variables Required

```env
# Required
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret_key
JWT_EXPIRE=24h

# Optional
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

## Next Steps

1. Add email notifications
2. Implement file uploads for training materials
3. Add WebSocket for real-time updates
4. Create admin dashboard for super_admin
5. Add export/reporting functionality
6. Set up automated backups
7. Implement rate limiting
8. Add API documentation with Swagger

## Support

For issues or questions:
- Check MongoDB documentation
- Review Express.js guides
- Check JWT best practices
- Monitor server logs for errors

## License

MIT License
