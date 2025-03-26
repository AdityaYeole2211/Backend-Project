import multer from "multer";

const storage = multer.diskStorage({
    destination : function(req,file,cb){
        cb(null, "./public/temp")
    },
    filename : function(req,file,cb){
        cb(null, file.originalname)
    }
})

export const upload = multer({
    storage, //i.e storage :storage, but since es6 can write in one word only if name same
})