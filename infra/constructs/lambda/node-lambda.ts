import { Duration } from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

export class NodeLambda extends NodejsFunction {
  constructor(scope: Construct, id: string, props: any) {
    super(scope, id, {
      runtime: Runtime.NODEJS_24_X,
      timeout: Duration.seconds(6),
      memorySize: 1024,
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ["@aws-sdk/*"],
        ...props.bundling,
      },
      ...props,
    });
  }
}
