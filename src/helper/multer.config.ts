import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

export const multerImageConfig = {
  storage: memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
      return cb(new BadRequestException('Hanya file gambar yang diizinkan'), false);
    }
    cb(null, true);
  },
};