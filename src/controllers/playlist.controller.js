import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


export const isAuthorizedOwner = (userId, req) => {
    
    return userId.toString() === req.user?._id.toString()
}
const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    // steps :  
    //get user id, playlist name and description
    // valiate name and description
    // create playlist 
    // return res

    const userId = req.user?._id 
    if(!name || !description){
        throw new ApiError(400, "Playlist title and description required.")
    }
    if(!userId){
        throw new ApiError(400, "User must be loggedIn for creating playlist.")
    }

    const playlist = await Playlist.create({
        title,
        description,
        owner : userId,
    })
    
    if(!playlist){
        throw new ApiError(500, "Unable to create playlist.")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200, playlist, "Playlist create successful.")
    )


})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    //steps :
    // verify userid in params == req.userid
    //fetch in database using aggregate where owner == userid
    //fetch videos from each playlist 
    //return playlistss

})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    //steps : 
    //fetch playlist by idd 
    //extract owner userid , verify whether current userid == owner
    //return playlist , extract videos also 

    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid Playlist ID.")
    }
    const userId = req.user?._id

    const pipeline = [
        {
            //match with playlist id
            $match : {
                _id : new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            //look for videos in that playlist
            $lookup : {
                from : "videos",//in videos model
                localField: "videos", // in playlistmodel
                foreignField : "_id", //in videoModel
                as : "videoDetails"
            }
        },
        {
            //ensure that video and videodetails is always array even if empty 
            $addFields : {
                videos : {
                    $ifNull : ["$videos", []] // if nnull -> default to empty array
                }, 
                videoDetails : {
                    $ifNull : ["$videoDetails", []] //if null -> default to empty array 
                }
            }
        },
        {
            //now currently videos in array , unable to find owners
            //unwind so that each video corresponds to new document
            //with similar attributes of playlist doc repeating in each
            $unwind : {
                path : "$videoDetails", //unwind video details array, 
                preserveNullAndEmptyArrays : true // keep  playlists even if no videoDetails
            }
        },
        {
            //now lookup for owener from users
            $lookup : {
                from : "users",
                localField : "videoDetails.owner",
                foreignField : "_id",
                as : "ownerDetails"
            }
        },
        {
            //add owner details to video
            $addFields : {
                //owner details is an array even if only one object in it-> take out
                "videoDetails.owner" : {
                    $arrayElemAt : [
                        "$ownerDetails", 0 //get first owner details from the array
                    ]
                }
            }
        },
        {
            //rebuilt  the playlist object as we had multiple docs -> one single doc with all 
            //video details in an array 
            $group : {
                _id : "$_id", //groups based on similar id , but since here id is same , will make one obj 
                name : {$first : "$name"},
                description : {$first : "$description"},
                owner : {$first : "$owner"},
                updatedAt : {$first : "$updatedAt"},
                videos : {
                    $push : {
                        //PUSHES IN ARRAY 
                        $cond : {
                            if : {$ne : ["$videoDetails", null]}, // IF VIDEO DETAILS IS NOT EQUAL TO NULL
                            then : "$videoDetails", // THEN ADD VIDEODETAILS
                            else : "$$REMOVE" ,// REMOVE NULL ENTRIES
                        }
                    }
                }

            }
        },
        {
            $project : {
                name : 1,
                description : 1,
                owner : 1,
                updatedAt : 1, 
                videos : {
                    $cond : {
                        if : {$eq : [{$size : "$videos"}, 0]}, //check ifszie of video array is 0
                        then : [],// if yes then return an empyt array 
                        else : "$videos" // else return populated videos array
                    }
                }
            }
        }
    ]

    const playlist = Playlist.aggregate(pipeline)

    if(!playlist){
        throw new ApiError(400, "Playlist does not exist in db.")
    }
    if(isAuthorizedOwner(playlist[0].owner, req)){
        throw new ApiError(400, "You are not authorised to view this playlist.")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, playlist[0], "Playlist feteched successfully.")
    )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    //TODO: add video to a playlist
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}