import { v2 as cloudinary } from 'cloudinary';

export const CloudinaryProvider = {
  provide: 'CLOUDINARY',
  useFactory: () => {
    // Debug sementara
    console.log('CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
    console.log('API_KEY:', process.env.CLOUDINARY_API_KEY);
    console.log('API_SECRET:', process.env.CLOUDINARY_API_SECRET);

    return cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  },
};