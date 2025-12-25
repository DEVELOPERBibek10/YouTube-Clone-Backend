import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLODUINARY_CLOUD_NAME,
  api_key: process.env.CLODUINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadFile = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      secure: true,
      resource_type: "auto",
    });
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    return null;
  }
};

const deleteFile = async (publicId) => {
  try {
    const response = await cloudinary.uploader.destroy(publicId);
    if (response.result !== "ok") {
      console.error(
        `Cloudinary deletion failed for ID: ${publicId}. Result: ${response.result}`
      );
      return null;
    }
    return response;
  } catch (error) {
    console.error("Error while deleting file from Cloudinary:", error.message);
    return null;
  }
};

export { uploadFile, deleteFile };
