import mongoose from "mongoose";
import { DB_NAME } from "./constants";

//generally iffe fucntions used -> executes as soon as index file loads
// ; written before as generally gives probelms if previous line of code 
//does not have ;

;(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        
    
    } catch (error) {
        console.error(error)
        throw error    
    }
})()