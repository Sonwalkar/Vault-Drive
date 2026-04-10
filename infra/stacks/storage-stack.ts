import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Bucket, HttpMethods } from "aws-cdk-lib/aws-s3";
import { ALLOWED_ORIGINS } from "../../apps/api/src/types/constants";

interface StorageStackProps extends StackProps {
  stage: string;
}
export class StorageStack extends Stack {
  public readonly bucket: Bucket;
  constructor(scope: Construct, id: string, props?: StorageStackProps) {
    (super(scope, id, props),
      (this.bucket = new Bucket(this, `VaultDriveBucket-${props?.stage}`, {
        bucketName: `vaultdrive-${props?.stage}-bucket`,
        cors: [
          {
            allowedMethods: [
              HttpMethods.GET,
              HttpMethods.PUT,
              HttpMethods.POST,
            ],
            allowedOrigins: ALLOWED_ORIGINS,
            allowedHeaders: ["*"],
            exposedHeaders: ["ETag", "Content-Length"],
          },
        ],
      })));
  }
}
