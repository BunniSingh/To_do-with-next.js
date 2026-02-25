import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// Fallback if MONGODB_URI is not set
if (!MONGODB_URI) {
  console.warn('[MongoDB] ⚠️ MONGODB_URI not defined, using fallback...');
  console.warn('[MongoDB] process.env keys with MONGO:', Object.keys(process.env).filter(k => k.includes('MONGO')));
  // Set fallback
  process.env.MONGODB_URI = 'mongodb://localhost:27017/my-app';
  console.warn('[MongoDB] Fallback MONGODB_URI set:', process.env.MONGODB_URI);
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
