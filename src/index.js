// require('dotenv').config({path : './env'}) //works but code consistency issues

import dotenv from "dotenv"
import connectDB from "./db/index.js";

dotenv.config({
    path : "./env"
})
connectDB() //call db-connection function here 















/*
//generally iffe fucntions used -> executes as soon as index file loads
// ; written before as generally gives probelms if previous line of code 
//does not have ;
const app = express()
;(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        //maybe the database is connected but our app is not bale to talk with it 
        //for that this listenrner used 
        app.on("error",  (error) => {
            console.error("Errrr: ", error)
            throw error
        })
        app.listen(process.env.PORT, () =>{
            console.log(`App listening on port : ${process.env.PORT}`)
        })
    
    } catch (error) {
        console.error(error)
        throw error    
    }
})()
*/