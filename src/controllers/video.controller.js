import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description, isPublished} = req.body
    // TODO: playlist adding to be done 
    if(!(title && description)){
        throw new ApiError(400, "Title and Description of video is required.")
    }
    if(!isPublished){
        isPublished = true
    }
    const owner = req.user?._id
    if(!owner){
        throw new ApiError(401, "Unauthorized request.")
    }

    const videoFileLocalPath = req.files?.videoFile[0]?.path 
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path

    if(!(videoFileLocalPath && thumbnailLocalPath)){
        throw new ApiError(400, "Video and thumbnail both required.")
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    if(!videoFile){
        throw new ApiError(501, "Video upload failed.")
    }
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if(!thumbnail) {
        throw new ApiError(501, "Thumbnail upload failed.")
    }

    const video = await Video.create({
        title,
        description,
        isPublished,
        videoFile : videoFile.url,
        thumbnail : thumbnail.url,
        duration : videoFile.duration,
        owner
    })

    if(!video){
        throw new ApiError(500, "Something went wrong while saving video in database.")
    }

    return res
    .status(200)
    .json(new ApiResponse(
        200, 
        video,
        "Video Upload successfull."
    ))

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: aggregation with likes , comments, subscriptions etc to be done.
    if(!videoId){
        throw new ApiError(400, "Invalid video request.")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(500, "Unable to fetch video.")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200, video, "Video fetched successfully.")
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!videoId && !isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid videoId")
    }
    //TODO: may be required to  first fetch video ,  then update and save
    const updates = {}
    if(req.body.title){
        updates.title = title
    }
    if(req.body.description){
        updates.description = description
    }
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path
    if(thumbnailLocalPath){
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
        if(!thumbnail){
            throw new ApiError(500, "Unable to upload thumbail")
        }
        updates.thumbnail = thumbnail.url
    }

    const video = Video.findByIdAndUpdate(
        videoId,
        {
            $set : updates
        },
        {
            new : true
        }
    )
    if(!video){
        throw new ApiError(200, "Something went wrong while updating video in database.")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, video, "Video details updated successfully."))

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete from cloudinary before delete from database to be done .
    if(!videoId && !isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id .")
    }

    //check if user is owner of video 

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(400, "Video with given id does not exist")
    }

    if(req.user?._id.toString() !== video.owner.toString()){
        throw new ApiError(400, "You do not have permission to perform delete ops on this video.")
    }

    const deletedVideo = await Video.findByIdAndDelete(videoId)

    if(!deletedVideo){
        throw new ApiError(500, "Unable to delete video.")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, deleteVideo, "Video deleted successfully." ))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!videoId && !isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video Id")
    }

    //see if video exits 
    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(500, "Unable to find video with given id.")
    }

    // change status 
    video.isPublished = !video.isPublished;

    await video.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video publish status updated!"));
})

//TODO: some other controller fucntions like getPublishedVideosByChannel, getVideosDataByChannel,
// searchVideosAndChannels may be required to implement. 
export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}