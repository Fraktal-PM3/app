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
    throw new Error("Please define MONGODB_URI in .env.local");
}

// Global caching to prevent multiple connections in dev (Next.js hot reload)
let cached = global._mongoose ?? (global._mongoose = { conn: null, promise: null });

export default async function dbConnect() {
    if (cached.conn) {
        console.log("Using cached MongoDB connection");
        return cached.conn;
    }

    if (!cached.promise) {
        console.log("Creating new MongoDB connection...");
        cached.promise = mongoose.connect(MONGODB_URI);
    }

    cached.conn = await cached.promise;
    console.log(
        "Connected to MongoDB:",
        mongoose.connection.host,
        mongoose.connection.port,
        mongoose.connection.name
    );
    
    // Log all collections to verify
    if (mongoose.connection.db) {
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log("Collections:", collections.map(c => c.name));
    }
    
    return cached.conn;
}
