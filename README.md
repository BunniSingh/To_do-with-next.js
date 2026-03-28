# Todo App with Real-Time Chat

A full-stack Next.js application with Todo management and WhatsApp-like real-time chat powered by Socket.io.

## Features

### Todo Management
- ✅ Create, edit, and delete todos
- ✅ Mark todos as complete/incomplete
- ✅ User-specific todo lists
- ✅ Dark mode support
- ✅ Responsive design

### Real-Time Chat
- 💬 One-on-one and group conversations
- 🔄 Real-time messaging with Socket.io
- 👥 User search and contact management
- 📱 Typing indicators
- ✅ Message status (sent, delivered, read)
- 🟢 Online/offline status
- 📱 Mobile-responsive design

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Authentication:** NextAuth.js v5 (Credentials provider)
- **Database:** MongoDB with Mongoose
- **Real-time:** Socket.io
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or cloud instance like MongoDB Atlas)

### Installation

1. **Clone the repository:**
```bash
git clone <your-repo-url>
cd todo-app-with-nextjs
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create `.env.local` file:**
```bash
cp .env.example .env.local
```

4. **Configure environment variables in `.env.local`:**
```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name

# NextAuth Configuration
# Generate secret: openssl rand -base64 32
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Session Configuration (optional)
NEXTAUTH_SESSION_MAX_AGE=2592000

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

5. **Run the development server:**
```bash
npm run dev
```

6. **Open [http://localhost:3000](http://localhost:3000)**

## Deploy to Render

### Step 1: Prepare MongoDB Atlas
1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a free cluster
3. Get your connection string
4. Whitelist `0.0.0.0/0` (all IPs) for Render access

### Step 2: Deploy on Render
1. Go to [Render.com](https://render.com)
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name:** todo-app-with-chat
   - **Environment:** Node
   - **Region:** Choose closest to your users
   - **Branch:** main
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node server.js`
   - **Instance Type:** Free

5. **Add Environment Variables:**
   - `MONGODB_URI` - Your MongoDB connection string
   - `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
   - `NEXTAUTH_URL` - Your Render app URL (e.g., `https://todo-app.onrender.com`)
   - `NEXT_PUBLIC_APP_URL` - Same as NEXTAUTH_URL
   - `NODE_ENV` - `production`
   - `PORT` - `3000`

6. Click **Create Web Service**

### Important Notes for Render
- First deployment takes 3-5 minutes
- Free tier instances spin down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds to wake up
- Use MongoDB Atlas (not local MongoDB) for cloud deployment

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/         # Authentication endpoints
│   │   ├── todos/        # Todo CRUD endpoints
│   │   └── chat/         # Chat endpoints
│   ├── chat/             # Chat page
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   └── page.js           # Main todo page
├── components/
│   ├── chat/             # Chat components
│   ├── ui/               # UI components
│   └── ...
├── context/
│   ├── SocketContext.js  # Socket.io provider
│   └── ThemeContext.js   # Dark mode provider
├── lib/
│   ├── models/           # Mongoose models
│   ├── socket.js         # Socket.io server
│   ├── auth.js           # NextAuth config
│   └── ...
└── ...
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/[...nextauth]` - NextAuth endpoints

### Todos
- `GET /api/todos` - Get all todos
- `POST /api/todos` - Create todo
- `PUT /api/todos` - Update todo
- `DELETE /api/todos?id=xxx` - Delete todo
- `PATCH /api/todos?id=xxx` - Toggle todo

### Chat
- `GET /api/chat/conversations` - Get conversations
- `POST /api/chat/conversations` - Create conversation
- `GET /api/chat/conversations/:id/messages` - Get messages
- `POST /api/chat/conversations/:id/messages` - Send message
- `GET /api/chat/users/search?q=query` - Search users

## Important Notes

### Custom Server
This app uses a custom Express server (`server.js`) for Socket.io integration. This means:
- Cannot be deployed to Vercel serverless
- Best for: Render, Railway, DigitalOcean, AWS EC2

### Socket.io Configuration
- WebSocket connection: `/socket.io`
- Auto-reconnection enabled
- Authentication via NextAuth session

## Troubleshooting

### Build fails on Render
- Check logs in Render dashboard
- Verify all environment variables are set
- Ensure MongoDB Atlas allows connections from all IPs

### Chat not working
- Verify Socket.io connection in browser console
- Check if WebSocket is enabled in your hosting platform
- Ensure NEXTAUTH_URL matches your domain

### Authentication issues
- Regenerate NEXTAUTH_SECRET (must be same in dev and prod)
- Check NEXTAUTH_URL matches your app URL exactly

## License

MIT
