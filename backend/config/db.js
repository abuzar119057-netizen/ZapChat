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
    console.error(`MongoDB Connection Error: ${error.message}`);
    // Do not call process.exit(1) so server stays alive and retries
  }
};

const getGfsBucket = () => {
  return gfsBucket;
};

module.exports = { connectDB, getGfsBucket };
