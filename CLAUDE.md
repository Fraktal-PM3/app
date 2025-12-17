# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 frontend application for a blockchain-based package transportation system called "Fraktal". It integrates with Hyperledger Firefly for blockchain operations and uses Convex for data persistence. The application supports dual-mode operation (transporter vs. sender) with real-time event streaming.

## Development Commands

### Running the Application

```bash
# Standard development mode
npm run dev

# Run as transporter (port 3000)
npm run transporter

# Run as sender (port 3001)
npm run sender

# Production build
npm run build

# Production start (default port 3000)
npm start

# Production start as transporter (default port 3000)
npm run start:transporter

# Production start as sender (port 3001)
npm run start:sender
```

### Testing and Code Quality

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Linting (zero warnings enforced)
npm run lint
```

## Environment Configuration

Required environment variables (see `.env.template`):

- `CONVEX_URL` - Convex backend URL (required for data persistence)
- `NEXT_PUBLIC_CONVEX_URL` - Convex URL for client-side access (required)
- `NEXT_PUBLIC_TRANSPORTER` - Boolean flag ("TRUE" for transporter, "FALSE" for sender)
- `FIREFLY_HOST` - Optional Firefly host (defaults based on transporter flag)
- `FIREFLY_NAMESPACE` - Optional Firefly namespace (default: "default")
- `PORT` - Optional port number for the Next.js server (default: 3000)

### Dual-Mode Architecture

The application operates in two distinct modes:

- **Transporter mode**: Connects to Firefly on port 8000, Convex on localhost:3220
- **Sender mode**: Connects to Firefly on port 8001, Convex on localhost:3210

**Port Configuration:**
- Development mode: Uses default port 3000 (configurable via `PORT` environment variable)
- Production transporter (`start:transporter`): Uses default port 3000
- Production sender (`start:sender`): Uses port 3001

This dual-mode setup allows running both transporters and senders simultaneously for testing.

## Architecture Overview

### Custom Server Setup

Unlike standard Next.js apps, this uses a custom Node.js server (`server.ts`) that:

1. Initializes Next.js app with custom HTTP server
2. Starts background event listener service on startup
3. Syncs historical events from Hyperledger Firefly
4. Implements graceful shutdown handlers
5. Manages WebSocket/SSE connections for real-time updates

The server automatically initializes `eventListenerService` which connects to Firefly and persists blockchain events to Convex.

### Real-time Event System

The application uses Server-Sent Events (SSE) for real-time updates:

**Server-side (`src/services/eventListener.ts`):**
- Background service that connects to Hyperledger Firefly
- Listens for blockchain events (CreatePackage, StatusUpdated, ProposeTransfer, etc.)
- Persists events to Convex
- Broadcasts events to connected clients

**Client-side (`src/providers/SSEConnectionProvider.tsx`):**
- Establishes SSE connection on component mount
- Provides `subscribe()` and `subscribeAll()` methods
- Automatically reconnects on connection loss
- All child providers subscribe to relevant events

**Event flow:**
1. Blockchain event occurs in Firefly
2. `eventListenerService` receives event
3. Event persisted to Convex
4. Convex automatically broadcasts changes to all subscribed clients
5. Client providers receive updates and re-render

### Provider Hierarchy

All providers are exported from `src/providers/index.ts` and nested in this order (see `src/app/layout.tsx`):

```
SSEConnectionProvider (root)
└── PackageProvider (packages & transfers)
    └── AuctionProvider (announcements & offers)
        └── MetricsProvider (role detection & metrics)
            └── MessageProvider (activity feed)
```

Each provider:
- Subscribes to SSE events for automatic updates
- Provides hooks for consuming data (e.g., `usePackages()`, `useMetrics()`)
- Maintains local state synced with backend via events

### Data Models (Convex Schema)

Data models are defined in the Convex backend (`convex/` directory):

- `packages` - Package entities with status, locations, dimensions
- `transfers` - Transfer proposals and executions
- `announcements` - Public package announcements
- `offers` - Transfer offers from transporters
- `activityEvents` - Activity feed for package history
- `systemState` - Node identity and sync state

All models are defined using Convex schema validators and automatically sync with the frontend via reactive queries.

### API Routes

Next.js App Router API routes in `src/app/api/`:

- `/api/packages/*` - CRUD operations for packages
- `/api/packages/events` - SSE endpoint for real-time events
- `/api/announcements/create` - POST endpoint to broadcast package announcement with price
- `/api/announcements/*` - Package announcements management
- `/api/transfers/*` - Transfer proposals
- `/api/messages/*` - Private messaging

All routes use the shared `getPackageService()` singleton from `src/app/api/packages/service.ts` to interact with Firefly.

### Server Actions

Server actions for secure server-side operations (in `src/app/packages/[id]/actions.ts`):

- `getCurrentMspId()` - Returns current node's MSP ID (server-side only)
- `checkPackageOwnership(packageMspId)` - Validates if current user owns a package (server-side only)

These functions use the "use server" directive and execute on the server even when called from client components.

### Page Structure

The app uses Next.js App Router with these main routes:

- `/` - Dashboard with role-based metrics (sender/transporter)
- `/createPackage` - Package creation form
- `/activePackage` - Active package tracking
- `/packages` - Package list with tabs (all, active, completed)
- `/packages/[id]` - Package details with owner-only announce functionality
- `/messages` - Message inbox
- `/offers` - Available delivery offers (announcements) grid
- `/offers/[id]` - Detailed offer view with map and transfer proposal

All pages are client components (`"use client"`) to support real-time updates and provider hooks.

### Package Ownership and Announcements

**Ownership Detection:**
- Package ownership is determined by comparing `packageData.mspId` with current node's MSP ID
- Uses server action `checkPackageOwnership()` in `src/app/packages/[id]/actions.ts`
- Server action calls `getMspIdentity()` from `service.ts` which queries Firefly's status API
- MSP ID is extracted from the verifier's signing key in format `"MSP_ID:certificate..."`
- Ownership check executes server-side, not exposed via external API endpoint
- Only the package creator (owner) can see and use the announce functionality
- Header component receives `isOwner` boolean prop from page component

**Announce Feature:**
- Located in `PackageDetailsHeader` component on package details page
- Only visible when: user is owner AND package has `packageDetails`
- Opens a dialog modal to collect suggested price (required)
- Calls `/api/announcements/create` endpoint which broadcasts package with price to all transporters
- Button states:
  - Default: "Announce Package" (enabled, default variant)
  - Already announced: "Already Announced" (disabled, outline variant with checkmark)
  - Success: "Announced!" (disabled temporarily)
- Disabled when: package already has an active announcement (`hasActiveAnnouncement` prop)
- Active announcement check: filters announcements by package ID and checks `isActive` flag
- Dialog includes price input validation (must be > 0)
- Success message auto-dismisses after 3 seconds
- Uses Megaphone/CheckCircle2 icons from lucide-react
- Dialog design matches application's monospace font and dark theme

## Key Technical Details

### Database Connection

Convex provides real-time reactive data synchronization. The application uses:
- Server-side: `convexServerClient` (from `src/lib/convexServerClient.ts`) for backend operations
- Client-side: React hooks from `convex/react` for reactive queries and mutations

Convex automatically handles connection management, caching, and real-time updates.

### Firefly Integration

The application uses `fraktal-lib` (private GitHub package) which wraps `@hyperledger/firefly-sdk`. The `PackageService` class provides high-level methods for blockchain operations.

**Important:** Package service initialization is async and must complete before use. The custom server ensures this happens at startup.

**MSP Identity Detection:**
- `getMspIdentity()` function in `src/app/api/packages/service.ts` extracts the node's MSP ID from Firefly
- Uses the same approach as `eventListener.ts`: calls `firefly.getStatus()` and parses `status.org.verifiers[0].value`
- MSP format: `"MSP_ID:certificate..."` - splits on `:` to extract MSP ID
- Result is cached in module scope to avoid repeated Firefly calls
- Returns both `mspId` and `nodeOrg` (organization name)
- Used for ownership validation in package details and other server-side operations
- Accessed via server actions, never exposed through external API routes

### TypeScript Path Aliases

The `@/*` alias maps to `src/*` (configured in tsconfig.json). Always use this for imports:

```typescript
import { PackageProvider } from "@/providers";
import convexServerClient from "@/lib/convexServerClient";
```

### Testing Setup

Uses Vitest with jsdom environment. Test files must match `src/**/*.{test,spec}.{ts,tsx}`. Setup file at `vitest.setup.ts` configures testing-library.

### Styling

- Tailwind CSS 4 with dark mode enabled by default
- Radix UI components wrapped in `src/components/ui/`
- Custom animations via `framer-motion` and `tw-animate-css`
- Global styles in `src/styles/globals.css`

## Design Language

This application follows a consistent design language across all pages and components. When creating new features or modifying existing ones, adhere to these principles:

### Core Design Principles

1. **Dark Mode First**: All components must support dark mode with appropriate color variants
2. **Monospace Typography**: Use `font-mono` class for all text to maintain terminal-aesthetic consistency
3. **Mobile-First Responsive**: Every component and page must be mobile-optimized with proper breakpoints
4. **Shadcn/UI Components**: Always use shadcn/ui components from `@/components/ui/` for consistency
5. **Grid-Based Layouts**: Use CSS Grid for complex layouts with responsive columns (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)

### Layout Standards

**Page Container Pattern:**
```tsx
<div className="min-h-screen bg-background">
  <div className="container mx-auto space-y-6 px-4 py-6 md:py-8">
    {/* Page content */}
  </div>
</div>
```

**Key Layout Rules:**
- Always include `px-4` for horizontal padding on mobile
- Use `py-6 md:py-8` for responsive vertical spacing
- Wrap pages in `min-h-screen bg-background` for consistent full-height backgrounds
- Use `space-y-6` for vertical spacing between major sections
- Apply `container mx-auto` for centered, responsive width containers

### Component Design Patterns

**Card Components:**
- Use `Card`, `CardHeader`, `CardTitle`, `CardContent` from shadcn/ui
- Add `border-border bg-card` classes for consistent theming
- Include `font-mono` on card containers
- Use `h-full` and `flex flex-col` for equal-height cards in grids
- Add `transition-all hover:border-primary/50` for interactive cards

**Color-Coded Sections:**
- **Pickup locations**: Green variants (`border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/50`)
- **Drop locations**: Red variants (`border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/50`)
- **Success states**: Green (`text-green-600 dark:text-green-400`)
- **Error states**: Red (`text-red-600 dark:text-red-400`)
- **Info sections**: Muted variants (`bg-muted/30`)

**Typography Hierarchy:**
- Page titles: `text-3xl font-bold uppercase tracking-tight`
- Section titles: `text-sm font-bold uppercase tracking-wider`
- Labels: `text-xs uppercase tracking-wider text-muted-foreground`
- Values: `text-lg font-bold` or `text-2xl font-bold` for emphasis
- Body text: `text-xs` with `font-semibold` for important info

**Icon Usage:**
- Always pair icons with text labels
- Use `lucide-react` for all icons
- Size: `h-3 w-3` or `h-4 w-4` depending on context
- Add `flex-shrink-0` to prevent icon squashing
- Color: `text-muted-foreground` for neutral icons

### Mobile Optimization Checklist

When creating or modifying components:

- [ ] Use responsive grid columns: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- [ ] Add proper padding: `px-4` on containers
- [ ] Use `flex-wrap` on badge/chip containers to prevent overflow
- [ ] Add `min-w-0` to flex items containing text to enable truncation
- [ ] Use `break-words` or `break-all` for long text (addresses, IDs)
- [ ] Apply `truncate` where text should be cut off with ellipsis
- [ ] Use `whitespace-nowrap` on badges to prevent text wrapping
- [ ] Stack elements vertically on mobile: `flex-col sm:flex-row`
- [ ] Hide non-essential text on mobile: `hidden sm:inline`
- [ ] Test with responsive preview tools

### Grid Patterns

**2-Column Info Grid (Desktop) / Stacked (Mobile):**
```tsx
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Icon className="h-3 w-3 flex-shrink-0" />
      <span className="uppercase tracking-wider">Label</span>
    </div>
    <div className="text-lg font-bold">Value</div>
  </div>
</div>
```

**Metadata List:**
```tsx
<div className="space-y-2 text-xs">
  <div className="flex items-center justify-between gap-2">
    <span className="text-muted-foreground uppercase tracking-wider flex-shrink-0">
      Label
    </span>
    <span className="font-semibold text-right break-all">
      Value
    </span>
  </div>
</div>
```

### Component Reusability

- Extract repeated patterns into reusable components in `src/components/`
- Use shared layout components for consistent page structure
- Avoid duplicating margin/padding logic—handle it in layout components or use consistent Tailwind classes
- Create wrapper components for common card patterns

**Common Components to Reuse:**
- `PageHeader` - For all page headers with automatic breadcrumbs and back button
- `LocationDisplay` - For all pickup/dropoff location displays (green/red color-coded)
- Card wrappers for consistent styling
- Status badges and indicators
- Grid layouts for package info (weight, size, etc.)

**When to Create a Reusable Component:**
- Pattern appears 3+ times across the codebase
- Component has clear, well-defined responsibilities
- Styling needs to be consistent across multiple locations
- Component can be parameterized with props for different use cases

### Animation Standards

- Use `framer-motion` for page transitions and card animations
- Standard fade-in: `initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}`
- Stagger animations with incremental delays: `transition={{ delay: index * 0.05 }}`
- Keep animations subtle (0.1-0.4s delays max)

### Accessibility

- Always include proper ARIA labels on interactive elements
- Maintain color contrast ratios (WCAG AA minimum)
- Use semantic HTML elements
- Ensure keyboard navigation works correctly
- Add focus states with `focus:outline-none focus:ring-2 focus:ring-ring`

### Maps Integration

The application uses Leaflet for interactive maps displaying package delivery routes:

**Libraries:**
- `leaflet` - Core mapping library
- `react-leaflet` - React bindings (installed but not currently used in favor of direct Leaflet integration)

**Components:**
- `DeliveryMap.tsx` - Generic delivery map component (legacy)
- `PackageMap.tsx` - Package-specific map component integrated into package details

**Map Features:**
- CartoDB Dark Matter tiles for dark mode base layer
- Custom colored pin markers (emerald green for pickup, red for dropoff)
- Dashed blue polyline connecting pickup and dropoff locations
- Interactive popups showing location names and addresses
- Auto-fitting bounds to display entire route
- Fallback UI when location data is unavailable
- Dark theme optimized colors and styling to match application design

**Implementation Notes:**
- Maps use `useRef` to prevent re-initialization on re-renders
- Default Leaflet marker icons are fixed by loading from unpkg.com CDN
- Map cleanup is handled in `useEffect` return function to prevent memory leaks
- Custom divIcon with CSS is used for colored markers instead of default blue pins
- All map components are client-side only (`"use client"` directive required)
- SSR-safe: `typeof window !== "undefined"` checks prevent errors during server-side rendering
- Dark mode uses CartoDB Dark Matter tiles with bright markers (#10b981 green, #f87171 red) and enhanced line (#60a5fa blue)
- Marker styling includes box-shadow and dark borders for better visibility on dark maps

**Mobile Optimization:**
- Minimum height constraints (`min-h-[400px]` on card, `min-h-[300px]` on map container) ensure visibility on mobile
- `invalidateSize()` called on map initialization with 100ms delay for proper mobile rendering
- Window resize and orientation change listeners update map dimensions dynamically
- Flexbox layout with `min-h-0` on parent prevents overflow issues on mobile devices
- Maps are fully responsive and work in both portrait and landscape orientations

## Component Structure

### Common Reusable Components

**PageHeader (`src/components/common/PageHeader.tsx`):**
- Reusable header component for all pages with consistent styling
- Automatically generates breadcrumb navigation from URL path
- Auto-shows back button for paths deeper than 1 level
- Supports customizable right-side content injection
- Props:
  - `title`: string - Main page title (required)
  - `subtitle`: string - Optional subtitle/description
  - `icon`: LucideIcon - Optional icon next to title
  - `showBreadcrumbs`: boolean - Show/hide breadcrumbs (default: true)
  - `showBackButton`: boolean - Show/hide back button (auto-enabled for deep paths)
  - `backButtonHref`: string - Custom back button target
  - `backButtonLabel`: string - Custom back button text (default: "Back")
  - `breadcrumbLabels`: Record<string, string> - Custom labels for path segments
  - `customBreadcrumbs`: Breadcrumb[] - Override auto-generated breadcrumbs
  - `rightContent`: ReactNode - Custom content for right side (badges, indicators, etc.)
  - `animated`: boolean - Enable/disable framer-motion animation (default: true)

**Usage:**
```tsx
// Simple header (no breadcrumbs on root)
<PageHeader
  title="Dashboard"
  subtitle="Package Transportation Hub"
  showBreadcrumbs={false}
/>

// Header with icon and auto-generated breadcrumbs
<PageHeader
  title="Packages"
  subtitle="Manage your packages"
  icon={PackageIcon}
  breadcrumbLabels={{
    packages: "My Packages"
  }}
/>

// Header with right-side content injection
<PageHeader
  title="Available Offers"
  subtitle="Browse delivery opportunities"
  icon={Briefcase}
  rightContent={
    <>
      <Badge>{count} Available</Badge>
      <RealtimeIndicator isConnected={isConnected} />
    </>
  }
/>

// Deep path (e.g., /packages/123) - auto-shows back button
<PageHeader
  title="Package Details"
  subtitle="View package information"
  icon={PackageIcon}
  // Back button automatically shown
/>
```

**Design Benefits:**
- Consistent header styling across all pages
- Automatic breadcrumb generation reduces boilerplate
- Smart back button behavior for nested pages
- Reduces code duplication (60+ lines → 10 lines per page)
- Built-in responsive design and dark mode support
- Easy to extend with custom content

**LocationDisplay (`src/components/common/LocationDisplay.tsx`):**
- Reusable component for displaying pickup/dropoff locations with consistent styling
- Automatically applies color-coded design (green for pickup, red for dropoff)
- Supports optional coordinate display
- Props:
  - `type`: "pickup" | "dropoff" - determines styling and label
  - `location`: Object with `address`, `lat`, `lng` properties
  - `showCoordinates`: boolean - whether to display lat/lng coordinates
  - `className`: optional additional CSS classes

**Usage:**
```tsx
// Basic usage (announcements, simple displays)
<LocationDisplay type="pickup" location={pkg.pickupLocation} />
<LocationDisplay type="dropoff" location={pkg.dropLocation} />

// With coordinates (package details)
<LocationDisplay
  type="pickup"
  location={packageData.packageDetails?.pickupLocation}
  showCoordinates
/>
```

**Design Benefits:**
- Ensures consistent location styling across the application
- Reduces code duplication
- Makes it easy to update location display globally
- Automatically handles dark mode variants
- Built-in responsive design with proper text wrapping

### Package Details Components

The package details page (`/packages/[id]`) uses a modular component structure located in `src/components/package-details/`:

- `PackageDetailsHeader.tsx` - Package title, ID, back button, and connection status
- `PackageTrackingCard.tsx` - Visual timeline showing package delivery stages
- `PackageMap.tsx` - Interactive map displaying pickup and dropoff locations
- `PackageDetailsCard.tsx` - Package dimensions, weight, locations, and metadata
- `PackageContactCard.tsx` - Sender and recipient PII (if available)
- `PackageStatusCard.tsx` - Current package status with visual indicators
- `PackageTransfersTab.tsx` - Tab content for transfer proposals
- `PackageAnnouncementsTab.tsx` - Tab content for package announcements
- `PackageActivityTab.tsx` - Tab content for blockchain event history

**Layout Structure:**
The page uses a grid layout with these sections:
1. Header section (full width)
2. Tracking & Map row (2 columns on large screens)
3. Details & Contact/Status row (2 columns on large screens)
4. Tabs section (full width)

All components accept `packageData: Package` as a prop and handle missing/incomplete data gracefully with fallback UI.

### Offer Details Page

The offer details page (`/offers/[id]`) provides a comprehensive view of package announcements for transporters:

**Features:**
- Full package information with dimensions, weight, and pricing
- Interactive delivery route map using reused `PackageMap` component
- Detailed pickup and dropoff locations with `LocationDisplay` components
- Send transfer offer functionality with modal integration
- Auto-generated breadcrumbs showing navigation path
- Automatic back button to return to offers list

**Layout Structure:**
1. PageHeader with announcement ID and status badges
2. Map & Quick Info row (2 columns on large screens):
   - Interactive route map showing pickup/dropoff
   - Price card and package information summary
3. Delivery locations section (full width)
4. Action section (send offer or success message)

**Key Implementation Details:**
- Uses `useParams()` to get announcement ID from URL
- Finds announcement from `useAnnouncements()` provider
- Converts announcement data to Package format for map compatibility
- Dynamic import of PackageMap component (SSR disabled for Leaflet)
- State management for offer sent status
- Integrates TransferOfferModal for sending proposals

**Design Consistency:**
- Reuses LocationDisplay for pickup/dropoff sections
- Follows package details page layout patterns
- Uses same card styling and grid layouts
- Maintains monospace font and dark mode theming

## Common Development Patterns

### Adding a new package details component

1. Create new component in `src/components/package-details/`
2. Accept `packageData: Package` as a prop
3. Use `Card` wrapper from `@/components/ui/card` for consistent styling
4. Add fallback UI for when `packageData.packageDetails` is undefined
5. Import and add to `src/app/packages/[id]/page.tsx`
6. Wrap with `motion.div` for page transitions (optional)
7. Use font-mono class for monospace styling (follows design system)

### Adding a new blockchain event handler

1. Add event type to `fraktal-lib` types (external package)
2. Add handler in `src/services/eventListener.ts` (server-side)
3. Update Convex schema if needed (in `convex/` directory)
4. Convex automatically handles real-time updates
5. Update UI components to query the new data via Convex hooks

### Creating a new API route

1. Create `route.ts` in appropriate `src/app/api/` subdirectory
2. Import `getPackageService()` or `getFireFly()` from service.ts
3. Use `convexServerClient` for database operations
4. Use Zod schemas from `src/lib/packageSchemas.ts` for validation
5. Return `Response` objects (App Router standard)

### Adding a new page

1. Create directory in `src/app/` with `page.tsx`
2. Add `"use client"` directive if using hooks/state
3. Import necessary provider hooks from `@/providers`
4. Add navigation link in `src/app/layout.tsx` header
5. Create supporting components in `src/components/`

## Important Constraints

- **ESLint**: Configured with `--max-warnings 0` - builds fail on any warnings
- **TypeScript**: Strict mode enabled - all types must be properly defined
- **React 19**: Uses latest React with React Compiler babel plugin
- **Convex**: Requires running Convex backend - CONVEX_URL environment variable must be set
- **Firefly**: Backend dependency - app won't function without Firefly connection

## Troubleshooting

### Convex Connection Issues

**Symptom:** Application fails to load data or shows connection errors

**Causes:**
1. Convex backend is not running
2. Wrong URL configured in `CONVEX_URL` or `NEXT_PUBLIC_CONVEX_URL`
3. Convex deployment not initialized

**Solutions:**

**Option 1: Start Convex Development Server**
```bash
# Make sure you're in the project directory
cd convex

# Start Convex dev server
npx convex dev

# The dev server will run on http://localhost:3210 (sender) or http://localhost:3220 (transporter)
```

**Option 2: Verify Environment Variables**

Check your `.env` or `.env.local` file:
```bash
# Sender mode
CONVEX_URL=http://localhost:3210
NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210

# Transporter mode
CONVEX_URL=http://localhost:3220
NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3220
```

**Option 3: Initialize Convex**
```bash
# If Convex is not initialized, run:
npx convex dev --once

# This will set up the Convex project and create necessary configuration
```

**Quick Test:**
```bash
# Check if Convex dev server is running
curl http://localhost:3210  # Sender
curl http://localhost:3220  # Transporter

# Check Convex logs
# The convex dev command shows real-time logs of all operations
```

### Port Configuration Issues

**Symptom:** Running both sender and transporter on same port causes conflicts

**Solution:**
Ensure different ports for each mode:
- Sender: `PORT=3001` (configured in `start:sender` script)
- Transporter: `PORT=3000` (default)
- Convex Sender: `3210`
- Convex Transporter: `3220`

### Build Errors

**Symptom:** ESLint warnings during build

**Solution:**
```bash
# Fix linting issues
npm run lint

# Build will fail with any warnings (--max-warnings 0)
npm run build
```
