import { createRemoteJWKSet, jwtVerify } from "jose";
import { APIGatewayTokenAuthorizerEvent } from "aws-lambda";

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
);
export const handler = async (event: APIGatewayTokenAuthorizerEvent) => {
  try {
    const token = event.authorizationToken.replace("Bearer ", "");

    if (!token) {
      throw new Error("Unauthorized");
    }

    await jwtVerify(token, JWKS);

    return generatePolicy("data.user.id", "Allow", event.methodArn);
  } catch (err) {
    return generatePolicy("user", "Deny", event.methodArn);
  }
};

function generatePolicy(
  principalId: string,
  effect: "Allow" | "Deny",
  resource: string,
) {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
}
