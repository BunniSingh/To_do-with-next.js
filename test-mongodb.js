// Test MongoDB Connection Script
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

console.log('=== MongoDB Connection Test ===\n');
console.log('Environment loaded from: .env.local');
console.log('MONGODB_URI configured:', process.env.MONGODB_URI ? '✓ Yes' : '✗ No');
console.log('MONGODB_URI starts with:', process.env.MONGODB_URI?.split('://')[0]);
console.log();

import mongoose from 'mongoose';

async function testConnection() {
  try {
    console.log('Attempting to connect to MongoDB...');
    
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, opts);
    
    console.log('\n✓✓✓ MongoDB Connected Successfully! ✓✓✓\n');
    console.log('Connection details:');
    console.log('  - Host:', conn.connection.host);
    console.log('  - Database:', conn.connection.name);
    console.log('  - Ready State:', conn.connection.readyState === 1 ? 'Connected' : 'Disconnected');
    console.log();

    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections in database:');
    if (collections.length === 0) {
      console.log('  (No collections yet - database is empty)');
    } else {
      collections.forEach(col => {
        console.log(`  - ${col.name}`);
      });
    }
    console.log();

    // Test User model
    console.log('Testing User model...');
    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      password: String,
    }, { timestamps: true });
    
    const User = mongoose.models.User || mongoose.model('User', userSchema);
    const userCount = await User.countDocuments();
    console.log(`  - Users in database: ${userCount}`);
    console.log();

    // Test Todo model
    console.log('Testing Todo model...');
    const todoSchema = new mongoose.Schema({
      text: String,
      userId: String,
      completed: Boolean,
    }, { timestamps: true });
    
    const Todo = mongoose.models.Todo || mongoose.model('Todo', todoSchema);
    const todoCount = await Todo.countDocuments();
    console.log(`  - Todos in database: ${todoCount}`);
    console.log();

    // Test Conversation model
    console.log('Testing Conversation model...');
    const conversationSchema = new mongoose.Schema({
      name: String,
      type: String,
      participants: [String],
      createdBy: String,
    }, { timestamps: true });
    
    const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);
    const conversationCount = await Conversation.countDocuments();
    console.log(`  - Conversations in database: ${conversationCount}`);
    console.log();

    // Test Message model
    console.log('Testing Message model...');
    const messageSchema = new mongoose.Schema({
      conversation: String,
      sender: String,
      content: String,
      type: String,
      status: String,
    }, { timestamps: true });
    
    const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
    const messageCount = await Message.countDocuments();
    console.log(`  - Messages in database: ${messageCount}`);
    console.log();

    console.log('=== All Tests Passed! ===\n');
    
    // Close connection
    await mongoose.connection.close();
    console.log('Connection closed.');
    
    process.exit(0);
  } catch (error) {
    console.error('\n✗✗✗ MongoDB Connection Failed! ✗✗✗\n');
    console.error('Error:', error.message);
    console.error();
    
    if (error.message.includes('authentication failed')) {
      console.error('Possible issues:');
      console.error('  1. Incorrect username or password in MONGODB_URI');
      console.error('  2. IP address not whitelisted in MongoDB Atlas');
      console.error('  3. Database user does not have proper permissions');
    } else if (error.message.includes('getaddrinfo ENOTFOUND')) {
      console.error('Possible issues:');
      console.error('  1. Invalid cluster hostname in MONGODB_URI');
      console.error('  2. DNS resolution issue');
      console.error('  3. Network connectivity problem');
    } else if (error.message.includes('timeout')) {
      console.error('Possible issues:');
      console.error('  1. Network firewall blocking connection');
      console.error('  2. MongoDB Atlas cluster is paused or stopped');
      console.error('  3. IP address not whitelisted (0.0.0.0/0 for all IPs)');
    }
    
    console.error();
    console.error('Full error stack:');
    console.error(error.stack);
    
    process.exit(1);
  }
}

testConnection();
