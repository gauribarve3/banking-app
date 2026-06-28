const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');
    const conn = await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Atlas connection failed: ${error.message}`);
    console.log('Falling back to local MongoDB instance...');
    try {
      const conn = await mongoose.connect('mongodb://127.0.0.1:27017/bankingApp', { serverSelectionTimeoutMS: 3000 });
      console.log(`MongoDB local connected: ${conn.connection.host}`);
    } catch (localError) {
      console.error(`Local MongoDB connection also failed: ${localError.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
