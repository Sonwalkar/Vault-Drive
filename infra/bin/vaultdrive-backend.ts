#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { VaultdriveBackendStack } from "../lib/vaultdrive-backend-stack";
import { config } from "dotenv";

config(); // Load environment variables from .env file
const app = new cdk.App();
new VaultdriveBackendStack(app, "VaultdriveBackendStack", {
  env: {
    region: "ap-south-1",
  },
});
