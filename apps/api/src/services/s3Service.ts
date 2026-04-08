import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { S3_BUCKET_NAME } from "../types/constants";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export default class S3Service {
  private client: S3Client;

  constructor() {
    this.client = new S3Client({ region: process.env.AWS_REGION });
  }

  async putObject(key: string, contentType: string) {
    const bucketName = S3_BUCKET_NAME;
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });
    return await getSignedUrl(this.client, command, { expiresIn: 3600 }); // URL valid for 1 hour
  }
}
