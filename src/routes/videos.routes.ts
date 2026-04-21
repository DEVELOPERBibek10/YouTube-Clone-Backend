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
import { validation } from "../middlewares/validation.middleware.js";
import {
  updateVideoParamsSchema,
  updateVideoSchema,
  videoRequestSchema,
} from "../validators/video.validator.js";

const videoRouter = Router();

videoRouter.route("/signature").get(verifyJWT, getVideoSignature);
videoRouter
  .route("/upload")
  .post(
    verifyJWT,
    upload.single("thumbnail"),
    validation(videoRequestSchema),
    uploadVideo
  );
videoRouter
  .route("/details/:videoId")
  .patch(
    verifyJWT,
    validation(updateVideoParamsSchema),
    validation(updateVideoSchema),
    updateVideoDetails
  );
videoRouter
  .route("/thumbnail/:videoId")
  .patch(
    verifyJWT,
    validation(updateVideoParamsSchema),
    upload.single("thumbnail"),
    updateThumbnail
  );
videoRouter
  .route("/:videoId")
  .delete(verifyJWT, validation(updateVideoParamsSchema), deleteVideo);
videoRouter.route("").get(verifyJWT, getAllVideos);
videoRouter.route("/search").get(verifyJWT, getSuggestions);

export default videoRouter;
