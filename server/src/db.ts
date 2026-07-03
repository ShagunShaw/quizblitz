import mongoose from "mongoose";

// maybe this URI needs to be changed while in production (Check that)
// const MONGO_URI = `${process.env.MONGODB_URL}/${process.env.DATABASE_NAME}?authSource=admin`;
const MONGO_URI = (process.env.NODE_ENV === 'development')?`${process.env.MONGODB_URL}/${process.env.DATABASE_NAME}?authSource=admin`:process.env.MONGO_ATLAS_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI)
    console.log('Connected to MongoDB')
  } catch (error) {
    console.error('DB connection failed:', error)
    process.exit(1) // stop server
  }
}

export default connectDB