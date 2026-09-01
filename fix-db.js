const mongoose = require('mongoose');
const Message = require('./backend/models/Message');
const connectDB = require('./backend/config/db');
require('dotenv').config({ path: './backend/.env' });

async function fix() {
  await connectDB();
  const res = await Message.updateMany(
    { type: 'text', content: { $regex: /^-?\d+\.\d+,-?\d+\.\d+$/ } },
    { $set: { type: 'location' } }
  );
  console.log(`Updated ${res.modifiedCount} locations from type:text to type:location`);
  process.exit();
}
fix();
