#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { APIStack } from "../stacks/api-stack";
import { config } from "dotenv";
import { StorageStack } from "../stacks/storage-stack";

config(); // Load environment variables from .env file
const app = new cdk.App();

const stage = process.env.STAGE || "dev";
const env = {
  region: "ap-south-1",
};

const storageStack = new StorageStack(app, "VaultDriveStorageStack", {
  env,
  stage,
});

new APIStack(app, "VaultDriveAPIStack", {
  env,
  bucket: storageStack.bucket,
  stage,
});
