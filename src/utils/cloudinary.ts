import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse, UploadApiOptions } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadFile = async (
  localFilePath: string,
  publicId: string | null = null
): Promise<UploadApiResponse | null> => {
  const options: UploadApiOptions = {
    invalidate: true,
    secure: true,
    resource_type: "auto",
    public_id: "",
    overwrite: false,
  };

  if (publicId) {
    options.public_id = publicId;
    options.overwrite = true;
  }

  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, options);
    return response;
  } catch (error) {
    console.error(error);
    return null;
  } finally {
    try {
      await fs.promises.unlink(localFilePath);
    } catch (unlinkError) {
      if (unlinkError instanceof Error) {
        console.warn("Failed to delete temp file:", unlinkError.message);
        return null;
      }
      console.warn("Failed to delete temp file");
      return null;
    }
  }
};

const deleteFile = async (publicId: string) => {
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
    if (error instanceof Error) {
      console.error(
        "Error while deleting file from Cloudinary:",
        error.message
      );
      return null;
    }
    console.error("Error while deleting file from Cloudinary");
    return null;
  }
};

export { uploadFile, deleteFile };
