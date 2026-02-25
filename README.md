# Todo App with Real-Time Chat

A full-stack Next.js application featuring **Todo management** and **WhatsApp-like real-time chat** powered by Socket.io.

## Features

### Todo Management
- ✅ Create, edit, and delete todos
- ✅ Mark todos as complete
- ✅ User authentication with NextAuth.js
- ✅ Dark mode support
- ✅ Responsive design

### Real-Time Chat (New!)
- 💬 One-on-one and group conversations
- 🔄 Real-time messaging with Socket.io
- 👥 User search and contact management
- 📱 Typing indicators
- ✅ Message status (sent, delivered, read)
- 🎨 WhatsApp-inspired UI
- 📱 Mobile-responsive design

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Authentication:** NextAuth.js
- **Database:** MongoDB with Mongoose
- **Real-time:** Socket.io
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB (local or cloud instance)

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Create a `.env.local` file in the root directory:

```bash
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/myapp

# NextAuth Configuration
NEXTAUTH_SECRET=your-secret-key-change-this-in-production
NEXTAUTH_URL=http://localhost:3000

# Session Configuration
NEXTAUTH_SESSION_MAX_AGE=2592000

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── todos/        # Todo endpoints
│   │   └── chat/         # Chat endpoints (new)
│   ├── chat/             # Chat page (new)
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   └── page.js           # Main todo page
├── components/
│   ├── chat/             # Chat components (new)
│   │   ├── ConversationList.jsx
│   │   ├── MessageList.jsx
│   │   ├── MessageInput.jsx
│   │   └── NewConversationDialog.jsx
│   └── ...
├── context/
│   ├── SocketContext.js  # Socket.io provider (new)
│   └── ThemeContext.js
├── lib/
│   ├── models/           # Mongoose models (new)
│   │   ├── Conversation.js
│   │   └── Message.js
│   ├── socket.js         # Socket.io server setup (new)
│   └── ...
└── ...
```

## Chat Features Usage

1. **Start a Conversation:**
   - Click the chat icon (💬) in the header
   - Click the "+" button to create a new conversation
   - Search for users by name or email
   - Select users and start chatting

2. **Real-Time Features:**
   - Messages are delivered instantly via Socket.io
   - See when contacts are typing
   - Message status indicators (✓ sent, ✓✓ delivered, ✓✓ read)
   - Online/offline status

3. **Mobile Support:**
   - Responsive design works on all devices
   - Swipe navigation between conversation list and chat

## API Endpoints

### Chat
- `GET /api/chat/conversations` - Get all conversations
- `POST /api/chat/conversations` - Create new conversation
- `GET /api/chat/conversations/:id` - Get single conversation
- `GET /api/chat/conversations/:id/messages` - Get messages
- `POST /api/chat/conversations/:id/messages` - Send message
- `GET /api/chat/users/search?q=query` - Search users

## Important Notes

### Custom Server
This project uses a custom Express server (`server.js`) to integrate Socket.io with Next.js. The server is configured in `package.json`:

```json
"scripts": {
  "dev": "node server.js",
  "start": "node server.js"
}
```

### Socket.io Connection
The Socket.io server authenticates users via NextAuth.js sessions and provides real-time bidirectional communication for messaging.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Socket.io Documentation](https://socket.io/docs/v4/)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Mongoose Documentation](https://mongoosejs.com/)

## Deploy on Vercel

**Note:** Due to the custom server setup for Socket.io, deployment on Vercel requires additional configuration. Consider using:
- A VPS or cloud server (DigitalOcean, AWS EC2, etc.)
- Vercel with a separate Socket.io server (e.g., on Railway, Render)
- Vercel Serverless with WebSocket support (beta)

## License

MIT
