# Fraktal - Blockchain Package Transportation System

A sample blockchain application demonstrating a decentralized package transportation and delivery tracking system. This Next.js-based web application integrates with **Hyperledger Firefly** for blockchain operations and uses **Convex** for real-time data persistence.

> **Note:** This is a reference implementation designed to work with a deployed instance of the **Fraktal blockchain platform**. It serves as both a web interface and a Firefly event listener for blockchain-based package management.

## What is Fraktal?

Fraktal is a blockchain-based logistics platform that enables transparent and auditable package transportation. The system supports two distinct roles:

- **Senders**: Create packages, announce delivery needs, and track shipments
- **Transporters**: Browse available packages, submit offers, and execute deliveries

All package state transitions, transfer proposals, and deliveries are recorded on the blockchain, providing an immutable audit trail.

## Architecture Overview

This application consists of three main components:

1. **Next.js Web Interface**: User-facing dashboard for package management and tracking
2. **Firefly Event Listener**: Background service that monitors blockchain events and persists them to Convex
3. **Convex Database**: Real-time data layer that syncs blockchain state with the frontend

The application operates in dual-mode (sender or transporter) and can run multiple instances simultaneously for testing different network participants.

## Prerequisites

Before setting up this application, ensure you have the following infrastructure in place:

### 1. Hyperledger Firefly Node

- **A running Firefly node** connected to a blockchain network
- The blockchain network must have the **`pm3package` smart contract** deployed and committed by all participating peers
- Firefly API must be accessible on:
  - Port `8000` for transporter nodes (default)
  - Port `8001` for sender nodes (default)
  - Or custom ports specified in your environment configuration

### 2. Fraktal Blockchain Platform

- This application is designed to work with a **deployed Fraktal blockchain platform**
- The platform includes:
  - Blockchain network configuration (Hyperledger Fabric or Ethereum)
  - Firefly nodes for each organization
  - Smart contract deployment (`pm3package`)
  - Proper MSP (Membership Service Provider) configuration for peer identity

### 3. Docker and Docker Compose

- **Docker** and **Docker Compose** must be installed and running
- Required for:
  - Firefly node containerization
  - Blockchain network infrastructure
  - Convex local development environment

### 4. Convex Backend

- **Convex account** and project setup (free tier available at [convex.dev](https://convex.dev))
- Convex development server running locally:
  - Port `3210` for sender mode
  - Port `3220` for transporter mode
- Convex schema must be deployed (included in this repository under `convex/` directory)

### 5. Node.js and npm

- **Node.js 18+** (Node.js 20+ recommended)
- **npm** or **bun** package manager

## Installation

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd app
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

Create a `.env.local` file in the root directory based on `.env.template`:

```bash
# Convex Configuration
CONVEX_URL=http://localhost:3220                    # For transporter mode (3210 for sender)
NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3220       # For transporter mode (3210 for sender)

# Application Mode
NEXT_PUBLIC_TRANSPORTER=TRUE                        # Set to FALSE for sender mode

# Firefly Configuration (optional - defaults based on mode)
FIREFLY_HOST=http://localhost:8000                  # Firefly API endpoint
FIREFLY_NAMESPACE=default                           # Firefly namespace

# Port Configuration (optional)
PORT=3000                                           # Next.js server port
```

**Important Configuration Notes:**

- **Transporter Mode**: `NEXT_PUBLIC_TRANSPORTER=TRUE`, Convex on port `3220`, Firefly on port `8000`
- **Sender Mode**: `NEXT_PUBLIC_TRANSPORTER=FALSE`, Convex on port `3210`, Firefly on port `8001`
- You can run both modes simultaneously by using different ports and environment configurations

### Step 4: Initialize Convex

```bash
# Navigate to the convex directory
cd convex

# Initialize Convex project (first time only)
npx convex dev --once

# Start Convex development server
npx convex dev
```

The Convex dev server will:
- Deploy the schema from `convex/schema.ts`
- Start real-time synchronization
- Provide a dashboard at the URL shown in the terminal

### Step 5: Verify Firefly Connection

Ensure your Firefly node is running and accessible:

```bash
# Test Firefly connection (transporter)
curl http://localhost:8000/api/v1/status

# Test Firefly connection (sender)
curl http://localhost:8001/api/v1/status
```

You should receive a JSON response with node status information.

## Running the Application

The application includes separate scripts and Convex instances to allow you to run sender and transporter modes independently. This is useful for testing multi-party blockchain interactions on a single machine.

**Important Notes:**
- You can run **at most two instances simultaneously** (one sender and one transporter). To run both at the same time, **one must be in development mode** (`npm run`) and **the other in production mode** (`npm run start:`).
- **Environment variable precedence**: If you have any values specified in `.env.local`, they will **override** the settings provided by the package.json scripts. Ensure your `.env.local` file is configured correctly for your intended mode, or remove conflicting variables to let the scripts control the configuration.

### Development Mode

**Run as Transporter:**
```bash
npm run transporter
# Runs on http://localhost:3000 by default
# Connects to Convex on port 3220 and Firefly on port 8000
```

**Run as Sender:**
```bash
npm run sender
# Runs on http://localhost:3001 by default
# Connects to Convex on port 3210 and Firefly on port 8001
```

**Standard Development:**
```bash
npm run dev
# Uses environment variables to determine mode
```

### Production Mode

**Build the Application:**
```bash
npm run build
```

**Start Production Server:**
```bash
# Transporter mode (port 3000)
npm run start:transporter

# Sender mode (port 3001)
npm run start:sender

# Standard start (uses PORT environment variable)
npm start
```

### Running Both Simultaneously (for testing)

To simulate a multi-party blockchain network on one machine, run one instance in dev mode and the other in production mode:

**Option 1: Transporter in dev, Sender in production**
```bash
# Terminal 1 - Start transporter in development mode
npm run transporter

# Terminal 2 - Start sender in production mode (in a new terminal)
npm run start:sender
```

**Option 2: Sender in dev, Transporter in production**
```bash
# Terminal 1 - Start sender in development mode
npm run sender

# Terminal 2 - Start transporter in production mode (in a new terminal)
npm run start:transporter
```

## Application Features

### Sender Features
- Create new packages with pickup/dropoff locations
- Announce packages to the network with suggested pricing
- View and manage transfer proposals from transporters
- Track package status in real-time
- View complete activity history on the blockchain

### Transporter Features
- Browse available package announcements
- Submit transfer offers with pricing
- Execute approved transfers
- Track active deliveries
- View earnings and metrics

### Real-time Updates
- Server-Sent Events (SSE) for live blockchain event streaming
- Automatic UI updates when blockchain state changes
- Real-time package status tracking
- Live activity feed

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run linting (zero warnings enforced)
npm run lint
```

## Project Structure

```
app/
├── src/
│   ├── app/                  # Next.js App Router pages and API routes
│   ├── components/           # React components
│   ├── providers/            # Context providers for state management
│   ├── services/             # Firefly event listener and blockchain services
│   ├── lib/                  # Utility functions and configurations
│   └── styles/               # Global styles and Tailwind config
├── convex/                   # Convex backend (schema, queries, mutations)
├── server.ts                 # Custom Node.js server with event listener
└── .env.template             # Environment variable template
```

## Learn More

- [Hyperledger Firefly Documentation](https://hyperledger.github.io/firefly/)
- [Convex Documentation](https://docs.convex.dev/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Hyperledger Fabric Documentation](https://hyperledger-fabric.readthedocs.io/)
