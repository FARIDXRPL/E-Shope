import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor() {
    // Config langsung di sini, tidak bergantung pada provider
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  private uploadStream(buffer: Buffer, options: object): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) return reject(new BadRequestException(error.message));
          resolve(result!);
        },
      );
      const readable = new Readable();
      readable.push(buffer);
      readable.push(null);
      readable.pipe(stream);
    });
  }

  async uploadAvatar(file: Express.Multer.File, userId: number): Promise<string> {
    if (!file) throw new BadRequestException('File tidak ditemukan');
    const result = await this.uploadStream(file.buffer, {
      folder: 'e-shope/avatars',
      public_id: `avatar-${userId}`,
      overwrite: true,
      resource_type: 'image',
      transformation: [
        { width: 300, height: 300, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });
    return result.secure_url;
  }

  async uploadProductImages(files: Express.Multer.File[], productId: number): Promise<string[]> {
    if (!files || files.length === 0) throw new BadRequestException('File tidak ditemukan');
    const results = await Promise.all(
      files.map((file, index) =>
        this.uploadStream(file.buffer, {
          folder: `e-shope/products/${productId}`,
          public_id: `product-${productId}-${index + 1}`,
          overwrite: true,
          resource_type: 'image',
          transformation: [
            { width: 800, height: 800, crop: 'limit' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        }),
      ),
    );
    return results.map((r) => r.secure_url);
  }

  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  extractPublicId(url: string): string {
    const parts = url.split('/');
    const filename = parts[parts.length - 1].split('.')[0];
    const folder = parts[parts.length - 2];
    return `${folder}/${filename}`;
  }
}