import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"


const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        // console.log("\n access in fn : ", accessToken)
        // console.log("\n refresh in fn : ", accessToken)
        const refreshToken = user.generateRefreshToken()
        //save refresh token in database 
        user.refreshToken = refreshToken
        user.save( { validateBeforeSave : false } ) //not need to re-encrypt password

        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while creating access and refresh token")
    }
} 
const registerUser = asyncHandler( async (req, res) => {
//     1. recieve data from frontend.
    // 2. validation -> not empty 
    // 3. check if user already exists in db -> username , email etc 
    // 4. check for images , check for avatar (required field)
    // 5. upload them to cloudinary , check if uploaded or not 
    // 6. create new user object - create entry in db 
    // 7. remove password and refreshtoken from response 
    // 8. check if user created in db or not 
    // 9. return response 

    // recieve data 
    // console.log("\n \n req : \n", req);
    const {username, fullName, email, password} = req.body
    // console.log("email: ",  email)
    // console.log("\n \n Req.body :  \n", req.body)

    //Validation
    if(
        [fullName, username, email, password].some((field) => field.trim() === "")
    ){
        throw new ApiError(400, "All fields are required")
    }

    //check if user exists
    const existedUser = await User.findOne({
        $or : [{ username },{ email }]
    })
    if(existedUser){
        throw new ApiError(409, "Username or email already exists")
    }
    // console.log("\n \n req.files :  \n", req.files)
    // console.log("\n \n req.files.avatar :  \n", req.files?.avatar[0])
    
    //get image files, check for avatar (req field)
    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalPath = req.files?.coverImage[0]?.path //undefined error 

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required")
    }

    //UPLOAD ON CLOUDINARY
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath) 
    if(!avatar){
        throw new ApiError(400, "Avatar is required")
    }

    //create new db entry 
    const user = await User.create({
        fullName,
        email,
        avatar : avatar.url ,
        coverImage : coverImage?.url || "",
        password,
        username : username.toLowerCase()
    })

    //checking if created 
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering User.")
    }

    //send res

    return res.status(201).json(
        new ApiResponse(200, createdUser, "New user created successfully")
    )


})

const loginUser = asyncHandler(async (req,res) => {
    const {username, email ,password} = req.body

    // console.log(req.body)

    // console.log("\n username : ", username)
    // console.log("\n email : ", email)
    // console.log("\n password : ", password)

    if(!(username || email)){
        //atleast one is required 
        throw new ApiError(400, "Username or email required.")
    }

    const user = await User.findOne({
        $or : [{ username }, { email }]
    })
    
    if(!user){
        throw new ApiError(404, "User does not exist.")
    }

    //need to check password 
    //note here , the methods we write are in user not User.
    //User is an object given by mongoose

    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401 , "Invalid User credentials.")
    }

    //if password also correct , generate tokens 
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)
    // console.log("\n access : ",  accessToken)
    // console.log("\n refresh : ",  refreshToken)

    //the user we have here is different instance of user and the user we updated
    //in above method is different instance , so we need to update it 

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    //need to send response in form of cookie to be stored 
    // by default cookies can be accessed by frontend also 
    const options = {
        httpOnly : true,
        secure : true
        //by doing this only server can modify cookies 
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse( 
            200,
            {
                user : loggedInUser, accessToken, refreshToken
                //sending double here bcz sometimes maybe user wants access to tokens
                // if mobile app , cannot set cookies there , hence good pratice to save 
            },
            "User logged In successfully." 
        )

    )


})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                refreshToken : undefined
            }
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "User Logout Successfull.")
    )

})

const refreshAccessToken = asyncHandler(async(req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401, "Invalid refresh token.")
    }

    try {
        //check with jwt 
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        console.log(decodedToken)
    
        //get the user from db to check refreshtoken in db
        const user  = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401, "Invalid refresh token.")
        }
    
        if(user?.refreshToken !== incomingRefreshToken){
            throw new ApiError(401, "Refresh token is expired or used.")
        }
    
        const options = {
            httpOnly : true,
            secure : true
        }
        //generate new access and refresh token 
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user?._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken : newRefreshToken},
                "access token refreshed successfully."
    
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const changeCurrentPassword= asyncHandler(async(req,res) => {
    //take user given fields
    const {oldPassword, newPassword} = req.body
    // console.log("\n req.body : ", req.body)
    // console.log(oldPassword)
    // console.log(newPassword)
    // console.log("\n req.user : \n", req.user)
    // console.log("\n id : ", req.user?._id)

    //since verify jwt middleware is executed before this , user ->  req.user

    const user = await User.findById(req.user?._id)
    // console.log(user)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        return new ApiError(400, "Invalid old Password.")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave : false })

    return res.status(200).json(new ApiResponse(200, {}, "Password changed Successfully"))

})

const getCurrentUser = asyncHandler(async(req,res)=> {
    //request already has user as verifyjwt run before this 
    return res.status(200).json(new ApiResponse(200, req.user, "User get successfull."))
})

const updateAccountDetails = asyncHandler(async(req,res)=> {
    //here also jwt will run first 
    const {fullName, email} = req.body
    if(!(fullName && email)){
        throw new ApiError(400, "Fullname and email both required.")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
            fullName, //fullName : fullName
            email //email : email
            }
        },{
            new : true
        }
    ).select("-password -refreshToken")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "User account details updated successfully"))

})

const updateUserAvatar = asyncHandler(async(req,res) => {
    const avatarLocalPath = req.file?.path // only file as one file uplaoded
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar File is missing.")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400, "Error while uplaoding avatar image on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {avatar : avatar.url}
        },
        {
            new : true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar Image update successfull")
    )
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover Image file is missing.")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading  cover image on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {coverImage : coverImage.url}
        },
        {
            new : true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image update successfull.")
    )
})

const getUserChannelProfile = asyncHandler(async(req,res) => {
    const {username} = req.params // will get the channel name in url

    if(!username?.trim()){
        throw new ApiError(400, "Username is missing.")
    }
    //aggregation pipeline , 
    //can do find user by User.find method also , but will use $match of aggregation pipeline 
    //to match username 

    const channel = await User.aggregate([
        {
            $match : {
                username : username?.toLowerCase()
            }
        },
        {
            //finding subscribers
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "channel",
                as : "subscribers"
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField: "_id",
                foreignField : "subscriber",
                as : "subscribedTo"

            }
        },
        {
            $addFields : {
                subscriberCount : {
                    $size : "$subscribers" //as subscriber is field now, use $
                },
                channelsSubscribedToCount : {
                    $size : "$subscribedTo"
                },
                isSubscribed : {
                    $cond : {
                        if : {$in : [req.user?._id, "$subscribers.subscriber"]},
                        then : true,
                        else: false
                    }
                }
            }
        },
        {
            $project : {
                username : 1,
                fullname : 1,
                email : 1,
                avatar : 1,
                coverImage : 1,
                subscriberCount: 1,
                channelsSubscribedToCount : 1,
                isSubscribed : 1
            }
        }
    ])

    console.log("\n \n Aggregate pipeline channel output : \n", channel)

    if(!channel?.length){
        throw new ApiError(404, "Channel does not exist.")
    }
    //channel is an array , has 1 element, which is an iobject which has all fields mentioned 
    //in project query 

    return res 
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "Channel info fetched successfully.")
    )
})

const getWatchHistory = asyncHandler(async(req,res) => {
    const user = await User.aggregate([
        {
            //getting the user
            $match : {
                _id : new mongoose.Types.ObjectId(req.user._id)
            }

        },
        {
            //lookup for watchHistory 
            $lookup : {
                from : "videos",
                localField : "watchHistory",
                foreignField : "_id",
                as : "watchHistory",
                //here owner in videos will get empty , hence another lookup 
                pipeline : [
                    {
                        $lookup : {
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "owner", 
                            //dont need entire user , select only req->project
                            pipeline : [
                                {
                                    $project : {
                                        fullName : 1,
                                        username : 1,
                                        avatar : 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        //will get owner as an array, then have to take first element and all
                        //hassle -> convert the data type
                        $addFields : {
                            owner :{
                                //samme name to  overwrite owner array 
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res 
    .status(200)
    .json(
        new ApiResponse(200, 
            user[0].watchHistory , 
            "Watch History fetched successfully")
    )

})
export {
    registerUser,
    loginUser,
    logoutUser, 
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser, 
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}