import { v2 as cloudinary } from "cloudinary";
import type {
  UploadApiResponse,
  UploadApiOptions,
  DeleteApiResponse,
} from "cloudinary";
import fs from "fs";
import { ApiError } from "./ApiError.js";

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
    resource_type: "image",
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
    if (error instanceof ApiError) throw error;
    console.error("CLOUDINARY ERROR:", error);
    return null;
  } finally {
    if (fs.existsSync(localFilePath)) {
      try {
        await fs.promises.unlink(localFilePath);
      } catch (err) {
        console.error("Cleanup Error (Local file removal failed):", err);
      }
    }
  }
};

const deleteFile = async (publicId: string, resourceType: string = "image") => {
  try {
    const response = (await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    })) as any;
    return response;
  } catch (error) {
    console.error("System Error during Cloudinary deletion:", error);
    return null;
  }
};

export { uploadFile, deleteFile };
