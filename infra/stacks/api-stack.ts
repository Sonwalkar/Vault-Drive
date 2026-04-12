import {
  AuthorizationType,
  Cors,
  LambdaIntegration,
  RestApi,
  TokenAuthorizer,
} from "aws-cdk-lib/aws-apigateway";
import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { NodeLambda } from "../constructs/lambda/node-lambda";
import { ALLOWED_ORIGINS } from "../../apps/api/src/types/constants";

interface APIStackProps extends StackProps {
  bucket: Bucket;
  stage: string;
}

export class APIStack extends Stack {
  constructor(scope: Construct, id: string, props?: APIStackProps) {
    super(scope, id, props);

    // ------------------- API Gateway ------------------ //
    const api = new RestApi(this, "VaultDriveAPIs", {
      restApiName: `VaultDrive APIs - ${props?.stage}`,
      deployOptions: {
        stageName: props?.stage,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: ALLOWED_ORIGINS,
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

    const dashboardFunction = new NodeLambda(
      this,
      `DashboardFunction-${props?.stage}`,
      {
        functionName: `DashboardFunction-${props?.stage}`,
        entry: "apps/api/src/handlers/dashboard/index.ts",
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

    const deleteFileFunction = new NodeLambda(
      this,
      `DeleteFileFunction-${props?.stage}`,
      {
        functionName: `DeleteFileFunction-${props?.stage}`,
        entry: "apps/api/src/handlers/file/deleteFile/index.ts",
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
    props?.bucket.grantDelete(deleteFileFunction); // Grant delete permissions to the bucket

    const downloadFileFunction = new NodeLambda(
      this,
      `DownloadFileFunction-${props?.stage}`,
      {
        functionName: `DownloadFileFunction-${props?.stage}`,
        entry: "apps/api/src/handlers/file/downloadFile/index.ts",
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
    props?.bucket.grantRead(downloadFileFunction);

    const listFileFunction = new NodeLambda(
      this,
      `ListFileFunction-${props?.stage}`,
      {
        functionName: `ListFileFunction-${props?.stage}`,
        entry: "apps/api/src/handlers/file/listFile/index.ts",
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
        resultsCacheTtl: Duration.seconds(0), // Disable caching
      },
    );

    // ------------------- API Gateway Routes ------------------ //

    // ------------------- File Routes ------------------ //
    const fileRoute = api.root.addResource("file");
    fileRoute
      .addResource("upload")
      .addMethod("POST", new LambdaIntegration(uploadFileFunction), {
        authorizer,
      });

    fileRoute
      .addResource("list")
      .addMethod("POST", new LambdaIntegration(listFileFunction), {
        authorizer,
      });

    const deleteFileRoute = fileRoute.addResource("delete");
    deleteFileRoute
      .addResource("{fileId}")
      .addMethod("DELETE", new LambdaIntegration(deleteFileFunction), {
        authorizer,
      });

    const downloadFileRoute = fileRoute.addResource("download");
    downloadFileRoute
      .addResource("{fileId}")
      .addMethod("GET", new LambdaIntegration(downloadFileFunction), {
        authorizer,
      });

    // ------------------- Folder Routes ------------------ //
    const folderRoute = api.root.addResource("folder");
    folderRoute
      .addResource("create")
      .addMethod("POST", new LambdaIntegration(createFolderFunction), {
        authorizer,
      });

    // ------------------- Dashboard Route ------------------ //
    const dashboardRoute = api.root.addResource("dashboard");
    dashboardRoute.addMethod("GET", new LambdaIntegration(dashboardFunction), {
      authorizer,
    });
  }
}
