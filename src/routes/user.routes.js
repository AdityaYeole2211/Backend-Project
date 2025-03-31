import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
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
)

router.route('/login').post(loginUser)

//secured routes -> login needed
router.route('/logout').post(verifyJWT, logoutUser) //injecting middleware 
export default router