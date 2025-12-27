import { Router } from "express";
import {
  loginUser,
  registerUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  updateDetails,
  updateAvatar,
  updateCoverImage,
} from "../controllers/users.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const userRouter = Router();

userRouter.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

userRouter.route("/login").post(loginUser);

// secure route
userRouter.route("/logout").post(verifyJWT, logoutUser);
userRouter.route("/refresh-token").post(refreshAccessToken);
userRouter.route("/current-user").get(verifyJWT, getCurrentUser);
userRouter.route("/update-details").patch(verifyJWT, updateDetails);
userRouter
  .route("/update-avatar")
  .patch(verifyJWT, upload.single("avatar"), updateAvatar);
userRouter
  .route("/update-coverImage")
  .patch(verifyJWT, upload.single("coverImage"), updateCoverImage);

export default userRouter;
