# Fraktal - Blockchain Package Transportation System

A sample blockchain application demonstrating a decentralized package transportation and delivery tracking system. This Next.js-based web application integrates with **Hyperledger Firefly** for blockchain operations and uses **Convex** for real-time data persistence.

> **Note:** This is a reference implementation designed to work with a deployed instance of the **Fraktal blockchain platform**. It serves as both a web interface and a Firefly event listener for blockchain-based package management.

## What is Fraktal?

Fraktal is a blockchain-based logistics platform that enables transparent and auditable package transportation. The system supports two distinct roles: **Senders** who create packages, announce delivery needs, and track shipments, and **Transporters** who browse available packages, submit offers, and execute deliveries. All package state transitions, transfer proposals, and deliveries are recorded on the blockchain, providing an immutable audit trail.

## Architecture Overview

This application consists of three main components: a **Next.js Web Interface** that provides a user-facing dashboard for package management and tracking, a **Firefly Event Listener** that runs as a background service monitoring blockchain events and persisting them to Convex, and a **Convex Database** that serves as the real-time data layer syncing blockchain state with the frontend. The application operates in dual-mode (sender or transporter) and can run multiple instances simultaneously for testing different network participants.

## Prerequisites

Before setting up this application, ensure you have the following infrastructure in place.

**Hyperledger Firefly Node**

You will need a running Firefly node connected to a blockchain network. The blockchain network must have the `pm3package` smart contract deployed and committed by all participating peers. The Firefly API URL must be accessible and will be provided via the `FIREFLY_HOST` environment variable.

**Fraktal Blockchain Platform**

This application is designed to work with a deployed Fraktal blockchain platform. The platform should include blockchain network configuration (Hyperledger Fabric or Ethereum), Firefly nodes for each organization, the `pm3package` smart contract deployment, and proper MSP (Membership Service Provider) configuration for peer identity.

**Docker and Docker Compose**

Docker and Docker Compose must be installed and running. These are required for Firefly node containerization, blockchain network infrastructure, and the Convex local development environment.

**Convex Backend**

A Convex account and project setup is required (free tier available at [convex.dev](https://convex.dev)). The Convex development server should run locally on port 3210 for sender mode or port 3220 for transporter mode. The Convex schema (included in this repository under `convex/` directory) must be deployed.

**Node.js and npm**

Node.js 18 or higher is required (Node.js 20+ recommended), along with npm or bun package manager.

## Installation

Clone the repository and navigate to the app directory:

```bash
git clone <repository-url>
cd app
```

Install the required dependencies:

```bash
npm install
```

**Configuration**

Create a `.env.local` file in the root directory based on `.env.template`:

```bash
# Convex Configuration
CONVEX_URL=http://localhost:3220                    # For transporter mode (3210 for sender)
NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3220       # For transporter mode (3210 for sender)

# Application Mode
NEXT_PUBLIC_TRANSPORTER=TRUE                        # Set to FALSE for sender mode

# Firefly Configuration
FIREFLY_HOST=http://localhost:8000                  # Your Firefly instance URL
FIREFLY_NAMESPACE=default                           # Firefly namespace

# Port Configuration (optional)
PORT=3000                                           # Next.js server port
```

For transporter mode, set `NEXT_PUBLIC_TRANSPORTER=TRUE` with Convex on port 3220. For sender mode, set `NEXT_PUBLIC_TRANSPORTER=FALSE` with Convex on port 3210. Configure `FIREFLY_HOST` to point to your Firefly instance URL. You can run both modes simultaneously by using different ports and environment configurations.

**Initialize Convex**

Navigate to the convex directory and initialize the Convex project:

```bash
cd convex
npx convex dev --once  # First time only
npx convex dev
```

The Convex dev server will deploy the schema from `convex/schema.ts`, start real-time synchronization, and provide a dashboard at the URL shown in the terminal.

**Verify Firefly Connection**

Ensure your Firefly node is running and accessible:

```bash
curl <FIREFLY_HOST>/api/v1/status
# Example: curl http://localhost:8000/api/v1/status
```

You should receive a JSON response with node status information.

## Running the Application

The application includes separate scripts and Convex instances to allow you to run sender and transporter modes independently. This is useful for testing multi-party blockchain interactions on a single machine.

You can run at most two instances simultaneously (one sender and one transporter). To run both at the same time, one must be in development mode (`npm run`) and the other in production mode (`npm run start:`).

Note that if you have any values specified in `.env.local`, they will override the settings provided by the package.json scripts. Ensure your `.env.local` file is configured correctly for your intended mode, or remove conflicting variables to let the scripts control the configuration.

### Development Mode

**Run as Transporter:**
```bash
npm run transporter
# Runs on http://localhost:3000 by default
# Connects to Convex on port 3220 and Firefly via FIREFLY_HOST
```

**Run as Sender:**
```bash
npm run sender
# Runs on http://localhost:3001 by default
# Connects to Convex on port 3210 and Firefly via FIREFLY_HOST
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

**Sender Features**

Senders can create new packages with pickup and dropoff locations, announce packages to the network with suggested pricing, and view and manage transfer proposals from transporters. The interface provides real-time package status tracking and displays complete activity history from the blockchain.

**Transporter Features**

Transporters can browse available package announcements, submit transfer offers with pricing, and execute approved transfers. The dashboard allows tracking of active deliveries and provides visibility into earnings and metrics.

**Real-time Updates**

The application uses Server-Sent Events (SSE) for live blockchain event streaming, providing automatic UI updates when blockchain state changes. This enables real-time package status tracking and a live activity feed for all participants.

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
