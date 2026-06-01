import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import '../helper/cloudinary.config'; // pastikan config ter-load

@Injectable()
export class CloudinaryService {
  private uploadStream(
    buffer: Buffer,
    folder: string,
    publicId?: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder, public_id: publicId, resource_type: 'image' },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve(result);
        },
      );
      Readable.from(buffer).pipe(upload);
    });
  }

  async uploadAvatar(
    file: Express.Multer.File,
    userId: number,
  ): Promise<string> {
    if (!file) throw new BadRequestException('File tidak ditemukan');
    const result = await this.uploadStream(
      file.buffer,
      'e-shope/avatars',
      `avatar_${userId}`,
    );
    return result.secure_url;
  }

  async uploadProductImages(
    files: Express.Multer.File[],
    productId: number,
  ): Promise<string[]> {
    if (!files?.length) throw new BadRequestException('File tidak ditemukan');
    const results = await Promise.all(
      files.map((file, i) =>
        this.uploadStream(
          file.buffer,
          'e-shope/products',
          `product_${productId}_${i}`,
        ),
      ),
    );
    return results.map((r) => r.secure_url);
  }

  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}