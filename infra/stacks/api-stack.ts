import {
  Cors,
  LambdaIntegration,
  RestApi,
  TokenAuthorizer,
} from "aws-cdk-lib/aws-apigateway";
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { NodeLambda } from "../constructs/lambda/node-lambda";

interface APIStackProps extends StackProps {
  bucket: Bucket;
  stage: string;
}

export class APIStack extends Stack {
  constructor(scope: Construct, id: string, props?: APIStackProps) {
    super(scope, id, props);

    // ------------------- S3 Bucket ------------------ //

    // ------------------- API Gateway ------------------ //
    const api = new RestApi(this, "VaultDriveAPIs", {
      restApiName: `VaultDrive APIs - ${props?.stage}`,
      deployOptions: {
        stageName: props?.stage,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: ["http://localhost:3000"],
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });

    // ------------------- Lambda Functions ------------------ //
    const authorizerFunction = new NodeLambda(
      this,
      `authorizerFunction-${props?.stage}`,
      {
        functionName: `authorizerFunction-${props?.stage}`,
        entry: "apps/api/src/handlers/auth/authorizer/index.ts",
        handler: "handler",
        environment: {
          STAGE: props?.stage!,
          SUPABASE_URL: process.env.SUPABASE_URL!,
          SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
        },
      },
    );

    const uploadFileFunction = new NodeLambda(
      this,
      `UploadFileFunction-${props?.stage}`,
      {
        functionName: `UploadFileFunction-${props?.stage}`,
        entry: "apps/api/src/handlers/file/uploadFile/index.ts",
        handler: "handler",
        environment: {
          STAGE: props?.stage!,
          BUCKET_NAME: props?.bucket.bucketName!,
          SUPABASE_URL: process.env.SUPABASE_URL!,
          SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
        },
        bundling: {
          nodeModules: ["tslib"], // Include tslib in the bundle to avoid runtime errors
        },
      },
    );
    props?.bucket.grantPut(uploadFileFunction); // Grant write permissions to the bucket

    const createFolderFunction = new NodeLambda(
      this,
      `CreateFolderFunction-${props?.stage}`,
      {
        functionName: `CreateFolderFunction-${props?.stage}`,
        entry: "apps/api/src/handlers/folder/createFolder/index.ts",
        handler: "handler",
        environment: {
          STAGE: props?.stage!,
          SUPABASE_URL: process.env.SUPABASE_URL!,
          SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
        },
        bundling: {
          nodeModules: ["tslib"], // Include tslib in the bundle to avoid runtime errors
        },
      },
    );

    // ------------------- API Gateway Authorizer ------------------ //
    const authorizer = new TokenAuthorizer(
      this,
      `SupabaseAuthorizer-${props?.stage}`,
      {
        handler: authorizerFunction,
      },
    );

    // ------------------- API Gateway Routes ------------------ //
    const fileRoute = api.root.addResource("file");
    fileRoute
      .addResource("upload")
      .addMethod("POST", new LambdaIntegration(uploadFileFunction), {
        authorizer,
      });

    const folderRoute = api.root.addResource("folder");
    folderRoute
      .addResource("create")
      .addMethod("POST", new LambdaIntegration(createFolderFunction), {
        authorizer,
      });
  }
}
