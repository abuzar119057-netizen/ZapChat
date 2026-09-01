const mongoose = require('mongoose');
const Message = require('./models/Message');
require('dotenv').config();

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log('Connected to DB');
  
  const res = await Message.updateMany(
    { type: 'text', content: { $regex: /^-?\d+\.\d+,-?\d+\.\d+$/ } },
    { $set: { type: 'location' } }
  );
  console.log(`Updated ${res.modifiedCount} location messages from type:text → type:location`);
  process.exit(0);
}
fix().catch(e => { console.error(e); process.exit(1); });
