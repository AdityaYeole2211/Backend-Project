import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"


const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
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
export {
    registerUser,
    loginUser
}