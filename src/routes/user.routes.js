import { Router } from "express";
import { 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    registerUser,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory 
} from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router()

router.route('/register').post(
    upload.fields([
        {
            name : "avatar", //has to be similar name of field in frontend
            maxCount : 1
        },
        {
            name : "coverImage",
            maxCount : 1
        }
    ]),
    registerUser
) //done

router.route('/login').post(loginUser)//done

//secured routes -> login needed
router.route('/logout').post(verifyJWT, logoutUser) //injecting middleware //done
router.route('/refresh-token').post(refreshAccessToken)//done
router.route('/change-password').post(upload.none(), verifyJWT, changeCurrentPassword)//done
router.route('/current-user').get(verifyJWT, getCurrentUser) //done
router.route('/update-account').patch(verifyJWT, updateAccountDetails)//done

router.route('/update-avatar').patch(verifyJWT, upload.single("avatar"), updateUserAvatar)//done
router.route('/update-coverImage').patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)//done
router.route('/c/:username').get(verifyJWT, getUserChannelProfile)
router.route('/watch-history').get(verifyJWT, getWatchHistory)

export default router