import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"



export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        //get token and check if valid 
        // console.log(req.cookies)
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        // console.log(token)
        if(!token){
            throw new ApiError(401, "Unauthorized request.")
        }
        // verify token from jewt
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if(!user){
            throw new ApiError(401, "Invalid Access Token ")
        }
    
        //send user in request
        req.user = user // adding new attribute user to req object 
        next() // must in middlewares
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token.")
    }

})