// require('dotenv').config({path : './env'}) //works but code consistency issues

import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path : "./env"
})
//call db-connection function here 
//connectDB is a asynchronous method , so technically it returns a promise on compleltion
//utlitise that promise to start listening on server on successfull connection to DB 
connectDB()
.then(() => {
    const port = process.env.PORT || 3000
    //maybe the database is connected but our app is not bale to talk with it 
    //for that this listenrner used 
    app.on("error", (error) => {
        console.error("Errr", error)
    })
    app.listen(port, () =>{
        console.log(`App listening on port :  ${port}`)
    })
})
.catch((err) => {
    console.log("MongoDB connection failed!!!!", err)
})















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