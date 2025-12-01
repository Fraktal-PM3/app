import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var _mongoose: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) {
    throw new Error(
        "Please define MONGODB_URI in .env or .env.local\n" +
        "Example: MONGODB_URI=mongodb://localhost:27017/fraktal"
    );
}

// Global caching to prevent multiple connections in dev (Next.js hot reload)
let cached = global._mongoose ?? (global._mongoose = { conn: null, promise: null });

// Configure mongoose connection options
mongoose.set('strictQuery', false);

export default async function dbConnect() {
    if (cached.conn) {
        console.log("[MongoDB] Using cached connection");
        return cached.conn;
    }

    if (!cached.promise) {
        console.log(`[MongoDB] Connecting to: ${MONGODB_URI}`);

        const opts = {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
            socketTimeoutMS: 45000,
        };

        cached.promise = mongoose.connect(MONGODB_URI, opts)
            .catch((err) => {
                cached.promise = null; // Reset promise on error
                console.error("[MongoDB] Connection failed:", err.message);
                console.error("[MongoDB] Make sure MongoDB is running on the specified port");
                console.error("[MongoDB] Connection URI:", MONGODB_URI.replace(/\/\/.*@/, "//<credentials>@"));
                throw err;
            });
    }

    try {
        cached.conn = await cached.promise;
        console.log(
            "[MongoDB] ✅ Connected successfully:",
            mongoose.connection.host,
            mongoose.connection.port,
            mongoose.connection.name
        );

        // Log all collections to verify
        if (mongoose.connection.db) {
            const collections = await mongoose.connection.db.listCollections().toArray();
            console.log("[MongoDB] Collections:", collections.map(c => c.name).join(", ") || "none");
        }

        return cached.conn;
    } catch (error) {
        cached.promise = null; // Reset on error
        throw error;
    }
}

// Handle connection events
mongoose.connection.on('connected', () => {
    console.log('[MongoDB] Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
    console.error('[MongoDB] Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('[MongoDB] Mongoose disconnected');
});
