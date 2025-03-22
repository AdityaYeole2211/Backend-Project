import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async() => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        //returns an object , which has  several properties  
        //generally have different databases for deployment, development and testing,
        // practice to checkk which database connected

        console.log("\n MongoDB connection Success, Host : ", connectionInstance.connection.host)
        
    } catch (error) {
        console.error("MongoDB Connection Failed!! : ", error)
        process.exit(1)
    }
}

export default connectDB;