# CanvaSync - Real-time Collaborative Whiteboard Application

CanvaSync is a powerful, real-time collaborative whiteboard application that enables teams to create, share, and collaborate on digital whiteboards from anywhere in the world. With an infinite canvas, intuitive drawing tools, and seamless real-time collaboration, CanvaSync transforms how teams brainstorm, plan, and visualize ideas together.

**Live Demo:** [https://canvasync.vercel.app/](https://canvasync.vercel.app/)

![CanvaSync Whiteboard](/public/ss.png)

## 🌟 Features

### Infinite Canvas

- Unlimited space to express your ideas without constraints
- Zoom and pan functionality for easy navigation
- Grid and snap-to-grid options for precise layouts

### Real-time Collaboration

- Multiple users can edit simultaneously
- See other users' cursors and changes in real-time
- Join and leave notifications for collaborators
- User presence indicators show who's currently viewing the whiteboard

### Rich Drawing Tools

- Pen, brush, and highlighter tools with customizable colors and sizes
- Shape tools including rectangles, circles, diamonds, and arrows
- Text tool with formatting options
- Selection and transformation tools for easy editing
- Stroke style options (solid, dashed, dotted)
- Fill options (transparent or solid with opacity control)

### Smart Features

- Keyboard shortcuts for power users
- Undo/redo functionality
- Copy, cut, and paste operations
- Export to PDF and image formats

### Mobile Optimized

- Fully responsive design works on all devices
- Touch-specific features for mobile users:
  - Two-finger pan to navigate
  - Pinch to zoom
  - Long press for context menus
  - Area selection with touch gestures
  - Mobile-specific UI adaptations

### User Management

- User authentication and authorization (including email/password and Google OAuth)
- Profile management with avatars
- Whiteboard sharing with customizable permissions

### Cloud Storage

- Automatic saving of whiteboards
- Access your whiteboards from any device
- Share whiteboards via links with customizable permissions

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MySQL database

### Installation

1. Clone the repository:

```bash
git clone https://github.com/ItsRudaksh/canvasync.git
cd canvasync
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables (For both root and server directory):

```bash
cp .env.example .env
```

Edit the `.env` file with your database and other configuration details.

4. Set up the database:

```bash
npx prisma migrate dev
```

5. Start the development server:

```bash
npm run dev
```

6. Start the socket server (in a separate terminal):

```bash
npm run socket
```

7. Open your browser and navigate to `http://localhost:3000`

## 🏗️ Architecture

CanvaSync is built with a modern tech stack:

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, Framer Motion
- **UI Libraries**:
  - [Shadcn UI](https://ui.shadcn.com/) - A collection of reusable components built with Radix UI and Tailwind CSS
  - [Aceternity UI](https://ui.aceternity.com/) - Modern UI components with beautiful animations and effects
- **Backend**: Node.js, Express, Socket.IO
- **Database**: MySQL with Prisma ORM
- **Authentication**: NextAuth.js (supports email/password and Google OAuth)
- **Real-time Communication**: Socket.IO

### Key Components

- **Whiteboard Editor**: The core canvas component that handles drawing, selection, and user interactions
- **Socket Server**: Manages real-time communication between users
- **Prisma Schema**: Defines the data model for users, whiteboards, and collaborators

### Deployment

- **Frontend**: Deployed on [Vercel](https://www.vercel.com/) at [https://canvasync.vercel.app/](https://canvasync.vercel.app/)
- **Socket Server**: Deployed on [Railway](https://railway.app/) for reliable real-time communication

## 🔧 Development

### Project Structure

```
canvasync/
├── app/                  # Next.js app directory
│   ├── api/              # API routes
│   ├── auth/             # Authentication pages
│   ├── dashboard/        # Dashboard pages
│   ├── whiteboard/       # Whiteboard pages
│   └── page.tsx          # Landing page
├── components/           # React components
│   ├── aceternity/       # Aceternity UI components
│   ├── auth/             # Authentication components
│   ├── dashboard/        # Dashboard components
│   ├── ui/               # Shadcn UI components
│   └── whiteboard/       # Whiteboard components
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
├── prisma/               # Prisma schema and migrations
├── public/               # Static assets
├── server/               # Socket.IO server
└── styles/               # Global styles
```

### Commands

- `npm run dev`: Start the Next.js development server
- `npm run build`: Build the application for production
- `npm run start`: Start the production server
- `npm run socket`: Start the Socket.IO server
- `npm run lint`: Run ESLint
- `npm run deploy`: Generate Prisma client and build the application

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [Socket.IO](https://socket.io/)
- [Prisma](https://www.prisma.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Radix UI](https://www.radix-ui.com/)
- [Shadcn UI](https://ui.shadcn.com/)
- [Aceternity UI](https://ui.aceternity.com/)
- [Lucide Icons](https://lucide.dev/)
- [Railway](https://railway.app/)

## Architecture Diagram

```mermaid
graph TD
    A[Users] -->|Interact via Browser/Mobile| B(Frontend - Next.js/React);
    B -->|HTTP Requests| C(Backend API - Next.js API Routes);
    C -->|CRUD Operations| D(Database - MySQL with Prisma);
    B -->|Real-time Updates| E(Socket Server - Node.js/Express/Socket.IO);
    E -->|Real-time Updates| B;
    C -->|Authentication| F(NextAuth.js);

    subgraph ClientSide
        B
    end

    subgraph ServerSide
        C
        D
        E
        F
    end

    style B fill:#f9f,stroke:#333,stroke-width:2px;
    style C fill:#ccf,stroke:#333,stroke-width:2px;
    style D fill:#9cf,stroke:#333,stroke-width:2px;
    style E fill:#cff,stroke:#333,stroke-width:2px;
    style F fill:#fca,stroke:#333,stroke-width:2px;
```

## Database Schema

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontSize': '16px'}}}%%
erDiagram
    User ||--o{ Account : "has"
    User ||--o{ Session : "has"
    User ||--o{ Whiteboard : "owns"
    User ||--o{ Collaborator : "is"
    Whiteboard ||--o{ Collaborator : "has"

    User {
        String id PK
        String name
        String email UK
        String password "nullable"
        String avatar "nullable"
        String image "nullable"
        DateTime emailVerified "nullable"
        DateTime createdAt
        DateTime updatedAt
    }

    Whiteboard {
        String id PK
        String title
        String content "LongText"
        Boolean isPublic
        DateTime createdAt
        DateTime updatedAt
        String userId FK
    }

    Collaborator {
        String id PK
        String whiteboardId FK
        String userId FK
        Boolean canEdit
        DateTime createdAt
        %% @@unique([whiteboardId, userId])
    }

    Account {
        String id PK
        String userId FK
        String type
        String provider
        String providerAccountId
        String refresh_token "nullable, Text"
        String access_token "nullable, Text"
        Int expires_at "nullable"
        String token_type "nullable"
        String scope "nullable"
        String id_token "nullable, Text"
        String session_state "nullable"
        %% @@unique([provider, providerAccountId])
    }

    Session {
        String id PK
        String sessionToken UK
        String userId FK
        DateTime expires
    }

    VerificationToken {
        String identifier
        String token UK
        DateTime expires
        %% @@unique([identifier, token])
    }

    Otp {
        String id PK
        String identifier UK
        String code
        DateTime createdAt
        DateTime expiresAt
    }
```

## Component Interaction: Real-time Whiteboard Editing

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontSize': '16px'}}}%%
sequenceDiagram
    participant User
    participant WhiteboardPage as "Whiteboard Page (app/whiteboard/[id]/edit/page.tsx)"
    participant Canvas as "Canvas Component (components/whiteboard/Canvas)"
    participant Toolbar as "Toolbar (components/whiteboard/Toolbar)"
    participant RealtimeService as "Realtime Service (hooks/useRealtimeCollaboration)"
    participant SocketIOServer as "Socket.IO Server"

    User->>Toolbar: Selects "Pen" tool
    Toolbar->>Canvas: Updates selected tool (e.g., via state/context)
    User->>Canvas: Draws on canvas
    Canvas->>RealtimeService: Sends new drawing data (path, color, etc.)
    RealtimeService->>SocketIOServer: Emits "drawing_update" event with data
    SocketIOServer-->>RealtimeService: Broadcasts "drawing_update" to other clients
    RealtimeService->>Canvas: Receives "drawing_update" from server
    Canvas->>Canvas: Renders new drawing from other user

    User->>Toolbar: Selects "Shape" tool (e.g., Rectangle)
    Toolbar->>Canvas: Updates selected tool
    User->>Canvas: Clicks and drags to draw a rectangle
    Canvas->>RealtimeService: Sends shape data (coordinates, dimensions, type)
    RealtimeService->>SocketIOServer: Emits "shape_add" event with data
    SocketIOServer-->>RealtimeService: Broadcasts "shape_add" to other clients
    RealtimeService->>Canvas: Receives "shape_add" from server
    Canvas->>Canvas: Renders new shape from other user
```

## API Endpoint Structure

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontSize': '16px'}}}%%
graph TD
    A(API Root: /api) --> Auth[auth]
    A --> Profile[profile]
    A --> Users[users]
    A --> Whiteboards[whiteboards]

    subgraph "Authentication Endpoints (/api/auth)"
        Auth --> NextAuth["[...nextauth] (Handles OAuth, sessions, etc.)"]
        Auth --> Register["register (POST)"]
        Auth --> ForgotPassword["forgot-password (POST)"]
        Auth --> ResetPassword["reset-password (POST)"]
        Auth --> Verify["verify (POST - e.g., email verification)"]
    end

    subgraph "Profile Endpoints (/api/profile)"
        Profile --> GetSetProfile["/ (GET, PUT - User's own profile)"]
        Profile --> Avatar["avatar (POST, DELETE - Upload/Remove Avatar)"]
        Profile --> SendDeleteOTP["send-delete-otp (POST - Send OTP for account deletion)"]
        Profile --> VerifyDelete["verify-delete (POST - Verify OTP and delete account)"]
    end

    subgraph "User Endpoints (/api/users)"
        Users --> UserId["{userId}"]
        UserId --> UserWhiteboards["whiteboards (GET - User's whiteboards)"]
    end

    subgraph "Whiteboard Endpoints (/api/whiteboards)"
        Whiteboards --> CreateWhiteboard["/ (POST - Create new whiteboard)"]
        Whiteboards --> ListPublicWhiteboards["/ (GET - List public/shared whiteboards)"]
        Whiteboards --> WhiteboardId["{id}"]
        WhiteboardId --> GetWhiteboard["/ (GET - Get specific whiteboard)"]
        WhiteboardId --> UpdateWhiteboard["/ (PUT - Update whiteboard details/content)"]
        WhiteboardId --> DeleteWhiteboard["/ (DELETE - Delete whiteboard)"]
        WhiteboardId --> Collaborators["collaborators"]
        Collaborators --> ListCollaborators["/ (GET - List collaborators)"]
        Collaborators --> AddCollaborator["/ (POST - Add collaborator)"]
        Collaborators --> UpdateCollaborator["{collaboratorId} (PUT - Update collaborator permissions)"]
        Collaborators --> RemoveCollaborator["{collaboratorId} (DELETE - Remove collaborator)"]
    end

    style A fill:#lightgrey,stroke:#333,stroke-width:2px
    style Auth fill:#e6e6fa,stroke:#333,stroke-width:2px
    style Profile fill:#e6e6fa,stroke:#333,stroke-width:2px
    style Users fill:#e6e6fa,stroke:#333,stroke-width:2px
    style Whiteboards fill:#e6e6fa,stroke:#333,stroke-width:2px
```

## User Authentication Flows

### 1. Email/Password Registration & Login Flow

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontSize': '16px'}}}%%
sequenceDiagram
    participant User
    participant Browser as "Browser (Frontend)"
    participant NextApp as "Next.js App (Frontend Pages/Components)"
    participant NextAPI as "Next.js API (/api/auth)"
    participant NextAuthLib as "NextAuth.js Library"
    participant DB as "Database (User Table)"

    %% Registration %%
    User->>Browser: Enters registration details (name, email, password)
    Browser->>NextApp: Submits registration form
    NextApp->>NextAPI: POST /api/auth/register (name, email, password)
    NextAPI->>NextAPI: Hash password
    NextAPI->>DB: Create User record
    alt User created successfully
        DB-->>NextAPI: User record
        NextAPI-->>NextApp: Success response (e.g., redirect to login or auto-login)
        NextApp-->>Browser: Shows success message / Redirects
    else Error (e.g., email exists)
        DB-->>NextAPI: Error
        NextAPI-->>NextApp: Error response
        NextApp-->>Browser: Shows error message
    end

    %% Login %%
    User->>Browser: Enters login credentials (email, password)
    Browser->>NextApp: Submits login form
    NextApp->>NextAuthLib: signIn('credentials', {email, password})
    NextAuthLib->>NextAPI: (Internally calls authorize callback in NextAuth config)
    NextAPI->>DB: Find user by email
    alt User found
        DB-->>NextAPI: User record (with hashed password)
        NextAPI->>NextAPI: Compare provided password with stored hash
        alt Password matches
            NextAPI-->>NextAuthLib: Return user object
            NextAuthLib->>NextAuthLib: Create session, issue JWT/session token
            NextAuthLib-->>NextApp: Session object / Redirect
            NextApp-->>Browser: Updates UI (logged in state) / Redirects to dashboard
        else Password mismatch
            NextAPI-->>NextAuthLib: Return null or error
            NextAuthLib-->>NextApp: Error
            NextApp-->>Browser: Shows login error
        end
    else User not found
        DB-->>NextAPI: Null/Error
        NextAPI-->>NextAuthLib: Return null or error
        NextAuthLib-->>NextApp: Error
        NextApp-->>Browser: Shows login error
    end
```

### 2. Google OAuth Flow

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontSize': '16px'}}}%%
sequenceDiagram
    participant User
    participant Browser as "Browser (Frontend)"
    participant NextApp as "Next.js App (Frontend Pages/Components)"
    participant NextAuthLib as "NextAuth.js Library"
    participant GoogleAuth as "Google Authentication Service"
    participant NextAPI as "Next.js API ([...nextauth].js callbacks)"
    participant DB as "Database (User & Account Tables)"

    User->>Browser: Clicks "Sign in with Google" button
    Browser->>NextApp: Initiates Google sign-in
    NextApp->>NextAuthLib: signIn('google')
    NextAuthLib-->>Browser: Redirects to Google OAuth consent screen
    User->>GoogleAuth: Authenticates with Google, grants permission
    GoogleAuth-->>Browser: Redirects back to app with authorization code
    Browser->>NextAuthLib: (Callback URL with code)
    NextAuthLib->>GoogleAuth: Exchanges authorization code for access token, profile info
    GoogleAuth-->>NextAuthLib: Access token, user profile from Google
    NextAuthLib->>NextAPI: (Internally calls signIn/jwt/session callbacks in NextAuth config)
    NextAPI->>DB: Find or create User based on Google email
    NextAPI->>DB: Create/update Account entry (linking Google ID to User)
    DB-->>NextAPI: User record
    NextAPI-->>NextAuthLib: Processed user object
    NextAuthLib->>NextAuthLib: Create session, issue JWT/session token
    NextAuthLib-->>NextApp: Session object / Redirect
    NextApp-->>Browser: Updates UI (logged in state) / Redirects to dashboard
```

## 📧 Contact

For questions or support, please contact us at rudrakshkapoor2004@gmail.com or open an issue on GitHub.
