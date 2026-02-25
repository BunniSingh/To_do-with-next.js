import mongoose from 'mongoose';
import dbConnect from './mongodb.js';

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

export async function findUsersByIds(ids) {
  await dbConnect();
  const users = await User.find({ _id: { $in: ids } }).select('-password');
  return users.map(user => user.toObject());
}

export async function searchUsers(query, excludeUserId) {
  await dbConnect();
  const searchRegex = new RegExp(query, 'i');
  const users = await User.find({
    $and: [
      { _id: { $ne: excludeUserId } },
      { $or: [{ name: searchRegex }, { email: searchRegex }] }
    ]
  }).select('-password').limit(20);
  return users.map(user => user.toObject());
}
