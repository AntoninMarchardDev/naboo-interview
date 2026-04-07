import { ApolloClient, HttpLink, InMemoryCache, NormalizedCacheObject } from "@apollo/client";

const uri = process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:3000/graphql";

function createApolloClient(): ApolloClient<NormalizedCacheObject> {
  return new ApolloClient({
    ssrMode: typeof window === "undefined",
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri,
      credentials: "include",
    }),
  });
}

// Browser: reuse singleton. Server: always create a fresh instance.
let browserClient: ApolloClient<NormalizedCacheObject> | null = null;

export function getApolloClient(): ApolloClient<NormalizedCacheObject> {
  if (typeof window === "undefined") {
    return createApolloClient();
  }
  if (!browserClient) {
    browserClient = createApolloClient();
  }
  return browserClient;
}

// Keep named export for pages still using the old pattern during migration
export const graphqlClient = getApolloClient();
