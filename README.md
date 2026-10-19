# 🦉 SemaSmart

A modern language-learning platform inspired by DUOLINGO, built with cutting-edge technologies to deliver a seamless user experience. This project replicates the core functionality of Duolingo with a focus on gamification, progress tracking, and interactive learning.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Project Structure](#-project-structure)
- [Installation & Setup](#-installation--setup)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [API Documentation](#-api-documentation)
- [Development Guidelines](#-development-guidelines)
- [Screenshots](#-screenshots)
- [Upcoming Features](#-upcoming-features)
- [Contributing](#-contributing)
- [License](#-license)

## 🚀 Features

### Core Learning Features
- **Units & Lessons**: Structured learning path with units containing multiple lessons
- **Interactive Challenges**: Multiple choice questions and assist-type challenges
- **Progress Tracking**: Real-time progress tracking across lessons and units
- **Points System**: Earn points for correct answers to unlock rewards
- **Hearts System**: Limited attempts per lesson to encourage careful learning

### Gamification
- **Quests**: Daily and weekly quests to maintain motivation
- **Leaderboard**: Compete with other learners globally
- **Shop System**: Redeem points for hearts
- **Achievement System**: Track learning milestones and achievements

### User Experience
- **User Authentication**: Secure authentication with Clerk (Google OAuth support)
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Audio Integration**: AI-generated voices powered by ElevenLabs
- **Real-time Updates**: Live progress updates and notifications

### Admin Features
- **Admin Dashboard**: Comprehensive admin panel for content management
- **Course Management**: Create, edit, and manage courses, units, and lessons
- **Challenge Creation**: Build interactive challenges with multiple options
- **User Management**: Monitor user progress and engagement

## 🛠️ Tech Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **Lucide React**: Beautiful icons
- **Zustand**: State management

### Backend & Database
- **PostgreSQL**: Reliable relational database
- **Drizzle ORM**: Type-safe database operations
- **Neon Database**: Serverless PostgreSQL hosting

### Authentication
- **Clerk**: User authentication and management

### External Services
- **ElevenLabs**: AI-generated voice synthesis
- **Vercel**: Deployment and hosting

## 📁 Project Structure

```
DuoLingo_Clone/
├── app/                    # Next.js App Router
│   ├── (main)/           # Main application routes
│   ├── (marketing)/      # Marketing pages
│   ├── admin/            # Admin dashboard
│   ├── api/              # API routes
│   └── lesson/           # Lesson interface
├── components/            # Reusable UI components
│   ├── ui/              # Base UI components
│   └── modals/          # Modal components
├── db/                   # Database configuration
│   ├── schema.ts        # Database schema
│   ├── queries.ts       # Database queries
│   └── drizzle.ts       # Drizzle configuration
├── lib/                  # Utility libraries
├── public/               # Static assets
├── scripts/              # Database scripts
└── store/                # State management
```

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Clerk account
- ElevenLabs account

### 1. Clone the Repository
```bash
git clone https://github.com/DhavalDudheliya/DuoLingo_Clone.git
cd DuoLingo_Clone
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="your_postgresql_connection_string"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
CLERK_SECRET_KEY="your_clerk_secret_key"

# ElevenLabs
ELEVENLABS_API_KEY="your_elevenlabs_api_key"
```

### 4. Database Setup
```bash
# Push schema to database
npm run db:push

# Seed initial data
npm run db:seed

# (Optional) Reset database
npm run db:reset
```

### 5. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key | ✅ |
| `CLERK_SECRET_KEY` | Clerk secret key | ✅ |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | ✅ |

## 🗄️ Database Setup

### Schema Overview
The application uses the following main entities:

- **Courses**: Language courses (e.g., German, Spanish)
- **Units**: Course sections containing multiple lessons
- **Lessons**: Individual learning sessions
- **Challenges**: Interactive questions within lessons
- **Challenge Options**: Multiple choice answers
- **User Progress**: Individual user learning progress

### Database Commands
```bash
# View database in Drizzle Studio
npm run db:studio

# Push schema changes
npm run db:push

# Seed database with sample data
npm run db:seed

# Reset database
npm run db:reset
```

## 📚 API Documentation

### Authentication Routes
- `POST /api/auth/sign-in` - User sign in
- `POST /api/auth/sign-up` - User registration
- `GET /api/auth/user` - Get current user

### Course Management
- `GET /api/courses` - List all courses
- `GET /api/courses/[id]` - Get specific course
- `POST /api/courses` - Create new course (Admin)
- `PUT /api/courses/[id]` - Update course (Admin)
- `DELETE /api/courses/[id]` - Delete course (Admin)

### Lesson & Challenge APIs
- `GET /api/lessons/[id]` - Get lesson details
- `GET /api/challenges/[id]` - Get challenge data
- `POST /api/challenge-progress` - Update challenge progress

### User Progress
- `GET /api/user-progress` - Get user progress
- `PUT /api/user-progress` - Update user progress

## 🛠️ Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow ESLint configuration
- Use Tailwind CSS for styling
- Implement proper error handling

### Component Structure
```typescript
// Example component structure
interface ComponentProps {
  // Define props interface
}

export const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // Component logic
  return (
    // JSX
  );
};
```

### Database Queries
```typescript
// Example database query
export const getUserProgress = async (userId: string) => {
  return await db.query.userProgress.findFirst({
    where: eq(userProgress.userId, userId),
    with: {
      activeCourse: true,
    },
  });
};
```

### State Management
Use Zustand for global state management:
```typescript
// Example store
interface AppState {
  hearts: number;
  points: number;
  setHearts: (hearts: number) => void;
  setPoints: (points: number) => void;
}
```

## 💻 Screenshots

### Homepage 🏠
![Home Page](https://raw.githubusercontent.com/DhavalDudheliya/Project-SS/main/lingo/1.png)

### Authentication 🔐
![Login Page](https://raw.githubusercontent.com/DhavalDudheliya/Project-SS/main/lingo/2.png)

### Learning Interface 📚
![Learn Page](https://raw.githubusercontent.com/DhavalDudheliya/Project-SS/main/lingo/3.png)
![Learn Page](https://raw.githubusercontent.com/DhavalDudheliya/Project-SS/main/lingo/4.png)

### Social Features 👥
![Leaderboard](https://raw.githubusercontent.com/DhavalDudheliya/Project-SS/main/lingo/5.png)
![Quests](https://raw.githubusercontent.com/DhavalDudheliya/Project-SS/main/lingo/6.png)

### Shop & Rewards 🛒
![Shop Page](https://raw.githubusercontent.com/DhavalDudheliya/Project-SS/main/lingo/7.png)

### Interactive Lessons 🎯
![Lesson Page](https://raw.githubusercontent.com/DhavalDudheliya/Project-SS/main/lingo/8.png)
![Lesson Page](https://raw.githubusercontent.com/DhavalDudheliya/Project-SS/main/lingo/9.png)
![Lesson Page](https://raw.githubusercontent.com/DhavalDudheliya/Project-SS/main/lingo/10.png)


### Admin Dashboard 📊
![Admin Dashboard](https://raw.githubusercontent.com/DhavalDudheliya/Project-SS/main/lingo/14.png)
![Admin Dashboard](https://raw.githubusercontent.com/DhavalDudheliya/Project-SS/main/lingo/15.png)
![Admin Dashboard](https://raw.githubusercontent.com/DhavalDudheliya/Project-SS/main/lingo/16.png)
![Admin Dashboard](https://raw.githubusercontent.com/DhavalDudheliya/Project-SS/main/lingo/17.png)

## 🔮 Upcoming Features

- **Streak Counting**: Track daily learning streaks
- **Reminder System**: Push notifications for daily practice
- **Personalized Revision**: AI-powered review sessions
- **Multi-language Support**: Additional language courses
- **Social Features**: Friend system and study groups
- **Offline Mode**: Download lessons for offline learning
- **Advanced Analytics**: Detailed learning insights

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Duolingo](https://duolingo.com) for inspiration
- [Clerk](https://clerk.dev) for authentication
- [ElevenLabs](https://elevenlabs.io) for voice synthesis
- [Vercel](https://vercel.com) for deployment

---

**Built with ❤️ using Next.js, TypeScript, and modern web technologies**
# SemaSmart
