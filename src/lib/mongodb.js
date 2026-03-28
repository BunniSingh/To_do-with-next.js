import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// Validate MONGODB_URI is set
if (!MONGODB_URI) {
  throw new Error('[MongoDB] MONGODB_URI environment variable is not defined. Please set it in your .env.local file.');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    throw new Error('MONGODB_URI is still not defined after fallback!');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(uri, opts).then((mongoose) => {
      return mongoose;
    }).catch((error) => {
      console.error('MongoDB connection error:', error);
      cached.promise = null;
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
