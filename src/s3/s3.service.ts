import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import * as path from 'path';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const bucketName = this.configService.get<string>('AWS_BUCKET_NAME');

    if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error('AWS S3 configuration parameters are missing or incomplete in environment.');
    }

    this.bucketName = bucketName;

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Uploads a file buffer to AWS S3 bucket in a specified folder.
   * @param file The Multer file object containing the buffer.
   * @param folder The folder path inside the S3 bucket.
   * @returns The S3 Key (path inside the bucket).
   */
  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    const uniqueId = randomUUID();
    const extension = path.extname(file.originalname);
    // Sanitize the original file name, leaving only alphanumeric, dash, and underscore characters
    const cleanBaseName = path.basename(file.originalname, extension).replace(/[^a-zA-Z0-9-_]/g, '');
    const key = `${folder}/${uniqueId}-${cleanBaseName}${extension}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(command);
      return key;
    } catch (error: any) {
      throw new InternalServerErrorException(`S3 file upload failed: ${error.message}`);
    }
  }

  /**
   * Generates a temporary pre-signed GET URL for reading/downloading a file.
   * @param fileKey The S3 Key of the file in the bucket.
   * @param expiresInSeconds Duration in seconds for the link to remain valid (default: 900 / 15 minutes).
   * @returns Pre-signed URL.
   */
  async getPresignedDownloadUrl(fileKey: string, expiresInSeconds = 900): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      return await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds,
      });
    } catch (error: any) {
      throw new InternalServerErrorException(`Failed to generate S3 pre-signed URL: ${error.message}`);
    }
  }

  /**
   * Deletes a file from the S3 bucket using its S3 key.
   * @param fileKey The S3 Key of the file in the bucket.
   */
  async deleteFile(fileKey: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      await this.s3Client.send(command);
    } catch (error: any) {
      throw new InternalServerErrorException(`S3 file deletion failed: ${error.message}`);
    }
  }

  /**
   * Downloads a file from S3 and returns its contents as a Buffer.
   * @param fileKey The S3 Key of the file in the bucket.
   * @returns Buffer of the downloaded file.
   */
  async downloadFile(fileKey: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });
      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('S3 response body is empty.');
      }

      // Convert Readable Stream to Buffer
      const streamToBuffer = (stream: any): Promise<Buffer> =>
        new Promise((resolve, reject) => {
          const chunks: any[] = [];
          stream.on('data', (chunk: any) => chunks.push(chunk));
          stream.on('error', reject);
          stream.on('end', () => resolve(Buffer.concat(chunks)));
        });

      return await streamToBuffer(response.Body);
    } catch (error: any) {
      throw new InternalServerErrorException(`S3 file download failed: ${error.message}`);
    }
  }
}
