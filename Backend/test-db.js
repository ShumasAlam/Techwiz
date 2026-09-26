const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  console.log('--- MongoDB Atlas Connection Test ---');
  console.log('Target URI:', uri ? uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@') : 'NOT SET');

  if (!uri) {
    console.error('❌ MONGODB_URI is missing in Backend/.env file');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB Atlas...');
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 20000,
    });
    console.log('✅ Connection Successful!');
    console.log(`Database Name : ${conn.connection.name}`);
    console.log(`Host          : ${conn.connection.host}`);
    console.log(`Ready State   : ${conn.connection.readyState === 1 ? 'Connected' : 'Other'}`);

    const collections = await conn.connection.db.listCollections().toArray();
    console.log(`Collections   : ${collections.map(c => c.name).join(', ') || 'No collections yet'}`);

    await mongoose.disconnect();
    console.log('Connection test completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection Failed:', err.message);
    process.exit(1);
  }
}

testConnection();
