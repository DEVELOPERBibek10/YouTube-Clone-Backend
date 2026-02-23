import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  deleteVideo,
  getAllVideos,
  getSuggestions,
  getVideoSignature,
  updateThumbnail,
  updateVideoDetails,
  uploadVideo,
} from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const videoRouter = Router();

videoRouter.route("/signature").get(verifyJWT, getVideoSignature);
videoRouter
  .route("/upload")
  .post(verifyJWT, upload.single("thumbnail"), uploadVideo);
videoRouter
  .route("/update-details/:videoId")
  .patch(verifyJWT, updateVideoDetails);
videoRouter
  .route("/update-thumbnail/:videoId")
  .patch(verifyJWT, upload.single("thumbnail"), updateThumbnail);
videoRouter.route("/delete/:videoId").delete(verifyJWT, deleteVideo);
videoRouter.route("").get(verifyJWT, getAllVideos);
videoRouter.route("/search").get(verifyJWT, getSuggestions);

export default videoRouter;
