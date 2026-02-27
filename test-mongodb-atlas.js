// Test MongoDB Atlas Connection Script
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

console.log('=== MongoDB Atlas Connection Test ===\n');

// Use the Atlas URI from env or the hardcoded one
const ATLAS_URI = 'mongodb+srv://bantikumarsingh91_db_user:advanced_todo_123@cluster0.ppuk47w.mongodb.net/advanced_todo_app?retryWrites=true&w=majority';

console.log('Environment loaded from: .env.local');
console.log('Testing Atlas URI...');
console.log('Cluster:', ATLAS_URI.split('@')[1].split('/')[0]);
console.log('Database:', ATLAS_URI.split('/')[2].split('?')[0]);
console.log();

mongoose.set('strictQuery', false);

async function testAtlasConnection() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    console.log('(This may take a few seconds...)\n');
    
    const opts = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    const conn = await mongoose.connect(ATLAS_URI, opts);
    
    console.log('✓✓✓ MongoDB Atlas Connected Successfully! ✓✓✓\n');
    console.log('Connection details:');
    console.log('  - Database:', conn.connection.name);
    console.log('  - Host:', conn.connection.host);
    console.log('  - Ready State:', conn.connection.readyState === 1 ? 'Connected ✓' : 'Disconnected ✗');
    console.log();

    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections in Atlas database:');
    if (collections.length === 0) {
      console.log('  (No collections yet - database is empty)');
    } else {
      collections.forEach(col => {
        console.log(`  - ${col.name}`);
      });
    }
    console.log();

    // Get stats
    const stats = await mongoose.connection.db.stats();
    console.log('Database stats:');
    console.log('  - Total documents:', stats.objects);
    console.log('  - Total collections:', stats.collections);
    console.log('  - Data size:', (stats.dataSize / 1024).toFixed(2), 'KB');
    console.log();

    console.log('=== Atlas Connection Test PASSED! ===\n');
    
    await mongoose.connection.close();
    console.log('Connection closed.');
    
    process.exit(0);
  } catch (error) {
    console.error('\n✗✗✗ MongoDB Atlas Connection FAILED! ✗✗✗\n');
    console.error('Error:', error.message);
    console.error();
    
    if (error.message.includes('authentication failed')) {
      console.error('❌ Issue: Authentication failed');
      console.error('🔧 Fix: Check username/password in MongoDB Atlas');
      console.error('   - Go to Database Access in Atlas');
      console.error('   - Verify user exists');
      console.error('   - Reset password if needed');
    } else if (error.message.includes('whitelist') || error.message.includes('IP address')) {
      console.error('❌ Issue: IP address not whitelisted');
      console.error('🔧 Fix: Add IP to MongoDB Atlas Network Access');
      console.error('   - Go to Network Access in Atlas');
      console.error('   - Add IP: 0.0.0.0/0 (allow from anywhere)');
      console.error('   - Or add your specific IP address');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('❌ Issue: Cannot resolve hostname');
      console.error('🔧 Fix: Check cluster URL is correct');
      console.error('   - Verify cluster name in connection string');
    } else if (error.message.includes('SSL') || error.message.includes('tls') || error.message.includes('alert')) {
      console.error('❌ Issue: SSL/TLS connection error');
      console.error('🔧 Fix: This usually means:');
      console.error('   1. Wrong password in connection string');
      console.error('   2. IP not whitelisted in Network Access');
      console.error('   3. Database user not created properly');
    } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      console.error('❌ Issue: Connection timeout');
      console.error('🔧 Fix: Check network/firewall settings');
      console.error('   - MongoDB Atlas cluster may be paused');
      console.error('   - Firewall blocking outbound connection');
    }
    
    console.error();
    console.error('Error code:', error.code || 'N/A');
    console.error('Error name:', error.name || 'N/A');
    
    process.exit(1);
  }
}

testAtlasConnection();
