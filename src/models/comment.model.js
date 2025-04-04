import mongoose, {Schema} from "mongoose";

const commentSchema = new Schema({
    content : {
        type : String,
        required : true
    },
    video : {
        // on which video comment done 
        type : Schema.Types.ObjectId,
        ref : "Video"
    },
    owner : {
        // who did comment 
        type : Schema.Types.ObjectId,
        ref : "User"
    }

}, {timestamps : true})

export const Comment = mongoose.model("Comment", commentSchema)