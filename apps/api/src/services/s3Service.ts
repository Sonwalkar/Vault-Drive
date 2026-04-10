import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { S3_BUCKET_NAME } from "../types/constants";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export default class S3Service {
  private client: S3Client;
  private bucketName: string;

  constructor(bucketName: string = S3_BUCKET_NAME) {
    this.client = new S3Client({ region: process.env.AWS_REGION });
    this.bucketName = bucketName;
  }

  async putObject(key: string, contentType: string) {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });
    return await getSignedUrl(this.client, command, { expiresIn: 3600 }); // URL valid for 1 hour
  }

  async deleteObject(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    return await this.client.send(command);
  }

  async getObject(key: string, filename: string) {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"`,
    });
    return await getSignedUrl(this.client, command, { expiresIn: 3600 });
  }
}
