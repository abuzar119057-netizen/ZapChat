const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

let gfsBucket;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    const db = mongoose.connection.db;
    gfsBucket = new GridFSBucket(db, {
      bucketName: 'uploads'
    });

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const getGfsBucket = () => {
  return gfsBucket;
};

module.exports = { connectDB, getGfsBucket };
