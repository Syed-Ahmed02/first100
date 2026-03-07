import type { AuthConfig } from "convex/server";

/**
 * Convex Auth0 provider config. Set AUTH0_DOMAIN and AUTH0_CLIENT_ID
 * in your Convex dashboard (Settings → Environment Variables) for your deployment.
 */
export default {
  providers: [
    {
      domain: process.env.AUTH0_DOMAIN!,
      applicationID: process.env.AUTH0_CLIENT_ID!,
    },
  ],
} satisfies AuthConfig;
