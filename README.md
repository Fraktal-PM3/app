# Fraktal-PM3 Application

A Next.js-based package management system built on Hyperledger Firefly, supporting multiple roles (sender, transporter, receiver) for tracking and managing package delivery workflows.

## Prerequisites

- Node.js (v20+)
- Docker and Docker Compose
- MongoDB (via Docker)
- Hyperledger Firefly network

## Project Structure

```
app/
├── frontend/                    # Next.js application
│   ├── src/
│   │   ├── app/                # Next.js app router pages
│   │   │   ├── activePackage/  # Active package management
│   │   │   ├── createPackage/  # Package creation flow
│   │   │   ├── receivePackage/ # Package receiving flow
│   │   │   ├── packages/       # Package listing and details
│   │   │   ├── offers/         # Transfer offers management
│   │   │   ├── messages/       # Messaging interface
│   │   │   └── api/            # API routes
│   │   ├── components/         # React components
│   │   │   ├── ui/             # UI primitives (shadcn/ui)
│   │   │   ├── dashboard/      # Dashboard components
│   │   │   ├── packages/       # Package-related components
│   │   │   ├── offers/         # Offer components
│   │   │   └── common/         # Shared components
│   │   ├── models/             # Database models (Mongoose)
│   │   ├── services/           # Business logic and services
│   │   ├── providers/          # React context providers
│   │   ├── types/              # TypeScript type definitions
│   │   └── styles/             # Global styles
│   ├── server.ts               # Custom Next.js server with Socket.io
│   └── package.json
├── docker-compose.yml          # MongoDB services configuration
└── README.md
```

## Getting Started

### 1. Start MongoDB Services

The application uses three separate MongoDB instances for different roles:

```bash
docker compose up -d
```

This starts:
- `mongodb_sender` (port 27017)
- `mongodb_transporter` (port 27018)
- `mongodb_receiver` (port 27019)

### 2. Install Dependencies

```bash
cd frontend
npm install
```

The `fraktal-lib` package from GitHub is automatically installed via `package.json`.

### 3. Configure Environment

Copy and configure the environment file:

```bash
cd frontend
cp .env.local.example .env.local  # If template exists
```

Edit [frontend/.env.local](frontend/.env.local) with your configuration:

```env
# MongoDB connection string
MONGODB_URI=mongodb://localhost:27018/fraktal

# Server port
PORT=3000

# Environment
NODE_ENV=dev

# Hyperledger Firefly node URL
FIREFLY_NODE_URL=http://firefly.example.com

# Role configuration
NEXT_PUBLIC_TRANSPORTER=FALSE
NEXT_PUBLIC_RECEIVER=FALSE
```

### 4. Run the Application

The application supports three roles, each connecting to a different MongoDB instance and Firefly node:

#### Development Mode

**Transporter** (port 3000):
```bash
npm run transporter
```

**Sender** (port 3001):
```bash
npm run sender
```

**Receiver** (port 3002):
```bash
npm run receiver
```

#### Production Mode

First, build the application:
```bash
npm run build
```

Then start with the appropriate role:
```bash
npm run start:transporter  # Port 3000
npm run start:sender       # Port 3001
npm run start:receiver     # Port 3002
```

## Architecture

### Frontend Stack
- **Framework**: Next.js 16 with App Router
- **UI**: React 19 with Radix UI primitives
- **Styling**: Tailwind CSS 4
- **State Management**: SWR for data fetching
- **Real-time**: Socket.io for live updates
- **Maps**: React Leaflet for delivery tracking
- **Charts**: Recharts for analytics

### Backend Services
- **Custom Server**: Express-like server with Next.js
- **Database**: MongoDB with Mongoose ODM
- **Blockchain**: Hyperledger Firefly SDK
- **Event Handling**: Real-time event listeners and sync services

### Key Features
- Multi-role support (sender, transporter, receiver)
- Real-time package tracking
- Transfer offer management
- Private messaging between parties
- Activity feeds and notifications
- Interactive delivery maps
- Package lifecycle management

## MongoDB Management

Connect to a specific MongoDB instance:

```bash
# Sender database
docker exec -it mongodb_sender mongosh

# Transporter database
docker exec -it mongodb_transporter mongosh

# Receiver database
docker exec -it mongodb_receiver mongosh
```

Useful MongoDB commands:
```javascript
use fraktal
db.packages.find().pretty()
db.packages.deleteMany({})
```

## Development

### Testing
```bash
npm run test
```

### Linting
```bash
npm run lint
```

## Hyperledger Firefly Integration

This application integrates with Hyperledger Firefly for blockchain operations. Each role (sender, transporter, receiver) connects to a different Firefly node specified by the `FIREFLY_NODE_URL` environment variable.

### Event Listeners
The custom server includes event listeners that sync blockchain events with the local MongoDB database in real-time.

## Additional Resources

- Frontend-specific documentation: [frontend/README.md](frontend/README.md)
- Claude AI documentation: [frontend/CLAUDE.md](frontend/CLAUDE.md)

