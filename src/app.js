import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"

const app = express()

app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials : true
    
}))

//data will come from different ways , telling app that only 
app.use(express.json({limit : "16kb"})) // data from json 
app.use(express.urlencoded({limit : "16kb"}))//data from urls
app.use(express.static("public")) //save certain files on server only (in public folder)
app.use(cookieParser())

//import routes 
import userRouter from "./routes/user.routes.js"

app.use('/api/v1/users', userRouter)
//url will be http://localhost:8000/api/v1/users/register
export {app}