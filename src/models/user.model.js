import mongoose, {Schema} from "mongoose";
import bcrypt  from "bcrypt"
import jwt from "jsonwebtoken"


const userSchema = new Schema({
    username : {
        type : String,
        required : true,
        unique : true,
        lowercase : true,
        trim : true,
        index : true // for searching 
    },
    email : {
        type : String,
        required : true,
        unique : true,
        lowercase : true,
        trim : true,
    },
    fullName : {
        type : String,
        required : true,
        trim : true,
        index : true // for searching 
    },
    avatar : {
        type : String, // cludinary url
        required  : true
    },
    coverImage : {
        type : String, //cloudinary url
    },
    password : {
        type : String,
        required : [true, "Password is required."]
    },
    refreshToken : {
        type : String,
    },
    watchHistory : [
        {
            type : Schema.Types.ObjectId,
            ref : "Video"
            //will add id of video into this array to maintain watch history 
        }
    ]
}, {timestamps : true})

userSchema.pre("save", async function (next) {
        if(!this.isModified("password")) return next();
        this.password = await bcrypt.hash(this.password, 10);
        next()        
})

//method to check password match with user entered password and hashed pass
userSchema.methods.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id : this._id,
            email : this.email,
            username : this.username,
            fullName : this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id : this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn : process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}
export const User = mongoose.model('User', userSchema)