import mongoose from 'mongoose';
import dbConnect from './mongodb';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

// Prevent model recompilation in development
const User = mongoose.models.User || mongoose.model('User', userSchema);

export async function findUserByEmail(email) {
  await dbConnect();
  const user = await User.findOne({ email: email.toLowerCase() });
  return user ? user.toObject() : null;
}

export async function findUserById(id) {
  await dbConnect();
  const user = await User.findById(id);
  return user ? user.toObject() : null;
}

export async function createUser(name, email, password) {
  await dbConnect();
  const user = await User.create({ name, email: email.toLowerCase(), password });
  return user.toObject();
}

export async function checkUserExists(email) {
  await dbConnect();
  const user = await User.findOne({ email: email.toLowerCase() });
  return !!user;
}
