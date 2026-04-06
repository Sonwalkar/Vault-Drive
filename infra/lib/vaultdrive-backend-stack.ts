import {
  LambdaIntegration,
  RestApi,
  TokenAuthorizer,
} from "aws-cdk-lib/aws-apigateway";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";

export class VaultdriveBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const stage = process.env.STAGE || "dev";

    // ------------------- S3 Bucket ------------------ //

    // ------------------- API Gateway ------------------ //
    const api = new RestApi(this, "VaultDriveAPIs", {
      restApiName: "VaultDrive APIs",
      deployOptions: {
        stageName: stage,
      },
    });

    // ------------------- Lambda Functions ------------------ //
    const uploadFileFunction = new NodejsFunction(this, "UploadFileFunction", {
      functionName: "UploadFileFunction",
      runtime: Runtime.NODEJS_24_X,
      entry: "apps/api/src/file/uploadFile/index.ts",
      handler: "handler",
      environment: {
        STAGE: stage,
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    });

    const authorizerFunction = new NodejsFunction(this, "authorizerFunction", {
      functionName: "authorizerFunction",
      runtime: Runtime.NODEJS_24_X,
      entry: "apps/api/src/auth/authorizer/index.ts",
      handler: "handler",
      environment: {
        STAGE: stage,
        SUPABASE_URL: process.env.SUPABASE_URL!,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    });

    // ------------------- API Gateway Authorizer ------------------ //
    const authorizer = new TokenAuthorizer(this, "SupabaseAuthorizer", {
      handler: authorizerFunction,
    });

    // ------------------- API Gateway Routes ------------------ //
    const fileRoute = api.root.addResource("file");
    fileRoute
      .addResource("upload")
      .addMethod("POST", new LambdaIntegration(uploadFileFunction), {
        authorizer,
      });
  }
}
