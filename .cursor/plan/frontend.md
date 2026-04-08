# Frontend Refactoring Plan

---

## P0 — Critical (Security / Breaking)

---

### P0-1 · Fix side effect during render in `logout.tsx`

**File:** `src/pages/logout.tsx`

`handleLogout()` is called directly in the render body. This runs the mutation, sets state, and triggers navigation on every render — including React 18 Strict Mode's double-mount in development. It causes repeated logout calls and unpredictable behavior.

```tsx
// src/pages/logout.tsx
import { useAuth } from "@/hooks";
import { useEffect } from "react";

export default function Logout() {
  const { handleLogout } = useAuth();

  useEffect(() => {
    handleLogout();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
```

---

### P0-2 · Fix shared Apollo cache across SSR requests

**File:** `src/graphql/apollo.ts`

A single module-level `graphqlClient` is created once and reused across all `getServerSideProps` calls in Node.js. The `InMemoryCache` is shared between concurrent server requests, so cached data can leak between users under any real load.

**Fix:** Create a fresh Apollo client per SSR request; keep the singleton only for the browser.

```ts
// src/graphql/apollo.ts
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
```

Update every `getServerSideProps` to call `getApolloClient()` instead of the module-level `graphqlClient`:

```ts
// Example: src/pages/discover.tsx
export const getServerSideProps: GetServerSideProps<DiscoverProps> = async () => {
  const client = getApolloClient(); // fresh instance per request
  const response = await client.query<GetActivitiesQuery, GetActivitiesQueryVariables>({
    query: GetActivities,
  });
  return { props: { activities: response.data.getActivities } };
};
```

---

### P0-3 · Fix broken `City` import in `services/cities.ts`

**File:** `src/services/cities.ts`

`City` is imported from `@/utils` but `utils/index.ts` only re-exports `global.styles` and `mantine.theme`. `City` does not exist there and the TypeScript build should fail.

**Fix:** Define `City` where it belongs — in the services layer — and remove the broken import.

```ts
// src/services/cities.ts
import { AxiosResponse } from "axios";
import { axiosInstance } from "./axios";

export interface City {
  nom: string;
  departement?: {
    code: string;
    nom: string;
  };
}

export function searchCity(search: string): Promise<City[]> {
  return axiosInstance
    .get<City[]>(`/communes?nom=${search}&fields=departement&boost=population&limit=5`, {
      baseURL: "https://geo.api.gouv.fr",
      withCredentials: false,
    })
    .then((response: AxiosResponse<City[]>) => response.data);
}
```

---

### P0-4 · Remove JWT from `localStorage` — rely solely on httpOnly cookie

**File:** `src/contexts/authContext.tsx`

The JWT is written to `localStorage` after login. `localStorage` is fully readable by any XSS payload. This is a security liability with no functional benefit: the Apollo client uses `credentials: "include"` (cookie transport) and never reads from `localStorage`. The httpOnly cookie is the actual session credential.

Additionally, the session-restore `useEffect` depends on `[user]`, causing re-runs after user is set. It should run once on mount.

```tsx
// src/contexts/authContext.tsx
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const snackbar = useSnackbar();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<GetUserQuery["getMe"] | null>(null);
  const router = useRouter();

  const [getUser] = useLazyQuery<GetUserQuery, GetUserQueryVariables>(GetUser);
  const [signin] = useMutation<SigninMutation, SigninMutationVariables>(Signin);
  const [signup] = useMutation<SignupMutation, SignupMutationVariables>(Signup);
  const [logout] = useMutation<LogoutMutation, LogoutMutationVariables>(Logout);

  // Run once on mount: attempt to restore session from the httpOnly cookie.
  // No localStorage — the cookie is the source of truth.
  useEffect(() => {
    getUser()
      .then((res) => setUser(res.data?.getMe ?? null))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignin = useCallback(async (input: SignInInput) => {
    try {
      setIsLoading(true);
      await signin({ variables: { signInInput: input } });
      // Re-fetch user from the cookie the server just set
      const res = await getUser();
      setUser(res.data?.getMe ?? null);
      router.push("/profil");
    } catch {
      snackbar.error("Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  }, [signin, getUser, router, snackbar]);

  const handleSignup = useCallback(async (input: SignUpInput) => {
    try {
      setIsLoading(true);
      await signup({ variables: { signUpInput: input } });
      router.push("/signin");
    } catch {
      snackbar.error("Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  }, [signup, router, snackbar]);

  const handleLogout = useCallback(async () => {
    try {
      setIsLoading(true);
      await logout();
      setUser(null);
      router.push("/");
    } catch {
      snackbar.error("Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  }, [logout, router, snackbar]);

  const value = useMemo(
    () => ({ user, isLoading, handleSignin, handleSignup, handleLogout }),
    [user, isLoading, handleSignin, handleSignup, handleLogout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

> Note: `access_token` is no longer read from the login mutation response. The `SignInDto` type and `login` mutation can return a boolean or omit the token entirely once the backend is updated (backend P1-3). For now, it's simply not read.

---

## P1 — High (Architecture / Correctness)

---

### P1-1 · Fix `useSearchParams` (App Router API) in a Pages Router file

**File:** `src/pages/explorer/[city].tsx`

`useSearchParams` is imported from `next/navigation`, which is the App Router API. This file is in `pages/` (Pages Router). This API is incompatible here and can break silently. Use `useRouter` from `next/router` and read `router.query`.

```tsx
// src/pages/explorer/[city].tsx — replace useSearchParams usage
import { useRouter } from "next/router";

export default function ActivityDetails({ activities, city }: CityDetailsProps) {
  const router = useRouter();

  const [searchActivity, setSearchActivity] = useState<string | undefined>(
    typeof router.query.activity === "string" ? router.query.activity : undefined
  );
  const debouncedSearchActivity = useDebounced(searchActivity, 300);

  const [searchPrice, setSearchPrice] = useState<number | undefined>(
    typeof router.query.price === "string" ? Number(router.query.price) : undefined
  );
  const debouncedSearchPrice = useDebounced(searchPrice, 300);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearchActivity) params.set("activity", debouncedSearchActivity);
    if (debouncedSearchPrice !== undefined) params.set("price", String(debouncedSearchPrice));

    const query = params.toString();
    const nextUrl = `/explorer/${city}${query ? `?${query}` : ""}`;

    // Avoid pushing to history if the URL hasn't actually changed
    if (router.asPath !== nextUrl) {
      router.push(nextUrl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, debouncedSearchActivity, debouncedSearchPrice]);

  // ...rest of render
}
```

---

### P1-2 · Stabilize `SnackbarContext` values and fix timer leak

**File:** `src/contexts/snackbarContext.tsx`

`error` and `success` are new function references on every render. Consumers (including `ActivityForm` and `AuthProvider`) re-render every time `SnackbarProvider` renders. The `setTimeout` is never cleared on unmount or when a new snackbar fires before the previous one auto-hides.

```tsx
// src/contexts/snackbarContext.tsx
import { Notification } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";

interface SnackbarContextType {
  error: (message: string) => void;
  success: (message: string) => void;
}

interface Snackbar {
  message: string;
  type: "error" | "success";
}

export const SnackbarContext = createContext<SnackbarContextType>({
  error: () => {},
  success: () => {},
});

export const SnackbarProvider = ({ children }: { children: React.ReactNode }) => {
  const [snackbar, setSnackbar] = useState<Snackbar | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSnackbar(null), 3000);
  }, []);

  // Clear timer on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  useEffect(() => {
    if (snackbar) scheduleHide();
  }, [snackbar, scheduleHide]);

  const error = useCallback((message: string) => {
    if (process.env.NODE_ENV === "development") console.error(message);
    setSnackbar({ message, type: "error" });
  }, []);

  const success = useCallback((message: string) => {
    setSnackbar({ message, type: "success" });
  }, []);

  const value = useMemo(() => ({ error, success }), [error, success]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {snackbar && (
        <Notification
          icon={snackbar.type === "error" ? <IconX size="1.1rem" /> : <IconCheck size="1.1rem" />}
          color={snackbar.type === "error" ? "red" : "green"}
          style={{ position: "fixed", right: 10, bottom: 10, zIndex: 999 }}
        >
          {snackbar.message}
        </Notification>
      )}
    </SnackbarContext.Provider>
  );
};
```

---

### P1-3 · Externalize API URLs via environment variables

**Files:** `src/graphql/apollo.ts`, `src/services/axios.ts`

Both files hardcode `http://localhost:3000`. Production builds will call the wrong host.

```ts
// src/services/axios.ts
import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

export const axiosInstance = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});
```

Add to `.env.local` (gitignored) and `.env.dist` (committed):

```
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:3000/graphql
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

---

### P1-4 · Fix `ActivityForm.tsx`: remove `snackbar` from deps, update cache after mutation

**File:** `src/components/Form/ActivityForm.tsx`

Two problems:
1. `snackbar` in the city-search `useEffect` dep array causes extra Geo API calls whenever the snackbar context re-renders (unstable reference).
2. After `createActivity`, `router.back()` navigates to a stale list (no cache update). The new activity won't appear until a hard refresh.

```tsx
// src/components/Form/ActivityForm.tsx

// 1. Fix the useEffect deps — snackbar is already stable after P1-2
useEffect(() => {
  if (!debouncedSearch) return;
  searchCity(debouncedSearch)
    .then((data) => setDisplayedCities(data.map((d) => ({ value: d.nom, label: d.nom }))))
    .catch((err) => snackbar.error(err?.message ?? "Une erreur est survenue"));
}, [debouncedSearch]); // snackbar removed — stable ref after P1-2, but also not a dep of the search logic

// 2. Refetch activities list after mutation
const [createActivity] = useMutation<CreateActivityMutation, CreateActivityMutationVariables>(
  CreateActivity,
  {
    refetchQueries: ["GetActivities", "GetUserActivities"],
    onError: () => snackbar.error("Une erreur est survenue"),
  }
);

const handleSubmit = async (values: CreateActivityInput) => {
  try {
    setIsLoading(true);
    await createActivity({
      variables: {
        createActivityInput: { ...values, price: Number(values.price) },
      },
    });
    router.back();
  } finally {
    setIsLoading(false);
  }
};
```

---

### P1-5 · Fix `vitest.config.ts` — add `@/*` path alias

**File:** `vitest.config.ts`

Vitest does not automatically apply `tsconfig.json` path aliases. Tests importing `@/graphql/generated/types` or any `@/` path will fail with a module resolution error.

```ts
// vitest.config.ts
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    dir: "./src",
    globals: true,
    include: ["**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./src/setupTests.ts"],
  },
});
```

---

### P1-6 · Fix `PageTitle.test.tsx` — use async `userEvent`

**File:** `src/components/PageTitle/PageTitle.test.tsx`

`@testing-library/user-event` v14 requires the async API (`userEvent.setup()` + `await user.click()`). The current synchronous `userEvent.click()` is incorrect and can produce false-passing tests.

```tsx
// src/components/PageTitle/PageTitle.test.tsx — the async test
it("affiche uniquement le titre et l'icon si prevPath est une fonction", async () => {
  const user = userEvent.setup();
  const goBack = vi.fn();
  render(<PageTitle title="Title" prevPath={goBack} />);

  expect(getTitle()).toBeInTheDocument();
  expect(getLink()).not.toBeInTheDocument();

  const buttonLink = getButton();
  expect(buttonLink).toBeInTheDocument();

  await user.click(buttonLink!);
  expect(goBack).toHaveBeenCalled();
});
```

---

## P2 — Medium (Performance / Improvements)

---

### P2-1 · Switch public pages from `getServerSideProps` to ISR (`getStaticProps` + `revalidate`)

**Files:** `src/pages/index.tsx`, `src/pages/discover.tsx`

These pages display public, infrequently-changing data (latest activities, all activities). Running `getServerSideProps` on every request adds server load and increases TTFB unnecessarily.

```tsx
// src/pages/index.tsx
export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  const client = getApolloClient();
  const response = await client.query<GetLatestActivitiesQuery, GetLatestActivitiesQueryVariables>({
    query: GetLatestActivities,
  });
  return {
    props: { activities: response.data.getLatestActivities },
    revalidate: 60, // Regenerate at most once per minute
  };
};
```

```tsx
// src/pages/discover.tsx
export const getStaticProps: GetStaticProps<DiscoverProps> = async () => {
  const client = getApolloClient();
  const response = await client.query<GetActivitiesQuery, GetActivitiesQueryVariables>({
    query: GetActivities,
  });
  return {
    props: { activities: response.data.getActivities },
    revalidate: 30,
  };
};
```

> `my-activities.tsx` and `activities/[id].tsx` must stay as `getServerSideProps` since they depend on the authenticated user or dynamic ID.

---

### P2-2 · Replace `Mantine Image` with `next/image` for all activity/city images

**Files:** `src/components/Activity.tsx`, `src/components/ActivityListItem.tsx`, `src/components/City.tsx`, `src/pages/activities/[id].tsx`

All card images use Mantine's `Image` with external URLs. `next/image` provides automatic WebP/AVIF conversion, lazy loading, LCP priority hints, and layout stability.

First, enable the remote domain in `next.config.js`:

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dummyimage.com",
      },
    ],
  },
};

module.exports = nextConfig;
```

Then replace `Image` usage in cards:

```tsx
// src/components/Activity.tsx — Card.Section
import Image from "next/image";

<Card.Section style={{ position: "relative", height: 160 }}>
  <Image
    src="https://dummyimage.com/480x360"
    fill
    style={{ objectFit: "cover" }}
    alt="activity thumbnail"
  />
</Card.Section>
```

---

### P2-3 · Clean up `profil.tsx` dead code

**File:** `src/pages/profil.tsx`

`ProfileProps` has `favoriteActivities` which is never loaded or used. `graphqlClient` and `GetServerSideProps` are imported but unused. `user?.firstName[0]` / `user?.lastName[0]` crashes if the string is empty.

```tsx
// src/pages/profil.tsx
import { PageTitle } from "@/components";
import { withAuth } from "@/hocs";
import { useAuth } from "@/hooks";
import { Avatar, Flex, Text } from "@mantine/core";
import Head from "next/head";

const Profile = () => {
  const { user } = useAuth();

  const initials =
    user
      ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
      : "";

  return (
    <>
      <Head>
        <title>Mon profil | CDTR</title>
      </Head>
      <PageTitle title="Mon profil" />
      <Flex align="center" gap="md">
        <Avatar color="cyan" radius="xl" size="lg">
          {initials}
        </Avatar>
        <Flex direction="column">
          <Text>{user?.email}</Text>
          <Text>{user?.firstName}</Text>
          <Text>{user?.lastName}</Text>
        </Flex>
      </Flex>
    </>
  );
};

export default withAuth(Profile);
```

---

### P2-4 · Add type generics to `withAuth` and `withoutAuth` HOCs

**Files:** `src/hocs/withAuth.tsx`, `src/hocs/withoutAuth.tsx`

Both HOCs use `ComponentType<any>` and `props: any`, losing all type safety of the wrapped component's props.

```tsx
// src/hocs/withAuth.tsx
import { useAuth } from "@/hooks";
import { Box, Loader } from "@mantine/core";
import { useRouter } from "next/router";
import { ComponentType, useEffect } from "react";

export function withAuth<P extends object>(WrappedComponent: ComponentType<P>) {
  const WithAuth = (props: P) => {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !user) {
        router.push("/signin");
      }
    }, [isLoading, router, user]);

    if (isLoading) {
      return (
        <Box sx={{ textAlign: "center" }}>
          <Loader sx={{ marginTop: "10rem" }} />
        </Box>
      );
    }

    return user ? <WrappedComponent {...props} /> : null;
  };

  WithAuth.displayName = `withAuth(${WrappedComponent.displayName ?? WrappedComponent.name})`;
  return WithAuth;
}
```

```tsx
// src/hocs/withoutAuth.tsx
export function withoutAuth<P extends object>(WrappedComponent: ComponentType<P>) {
  const WithoutAuth = (props: P) => {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && user) {
        router.push("/");
      }
    }, [isLoading, router, user]);

    if (isLoading) {
      return (
        <Box sx={{ textAlign: "center" }}>
          <Loader sx={{ marginTop: "10rem" }} />
        </Box>
      );
    }

    return !user ? <WrappedComponent {...props} /> : null;
  };

  WithoutAuth.displayName = `withoutAuth(${WrappedComponent.displayName ?? WrappedComponent.name})`;
  return WithoutAuth;
}
```

---

### P2-5 · Add dev-mode guard to custom hooks

**Files:** `src/hooks/useAuth.ts`, `src/hooks/useSnackbar.ts`

Both hooks silently return the context default value if used outside their provider. Add a dev-time assertion.

```ts
// src/hooks/useAuth.ts
import { AuthContext } from "@/contexts/authContext";
import { useContext } from "react";

export function useAuth() {
  const context = useContext(AuthContext);
  if (process.env.NODE_ENV !== "production" && !context) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return context;
}
```

```ts
// src/hooks/useSnackbar.ts
import { SnackbarContext } from "@/contexts/snackbarContext";
import { useContext } from "react";

export function useSnackbar() {
  const context = useContext(SnackbarContext);
  if (process.env.NODE_ENV !== "production" && !context) {
    throw new Error("useSnackbar must be used inside <SnackbarProvider>");
  }
  return context;
}
```

---

### P2-6 · Extract shared `ActivitiesLayout` to remove duplication between `discover` and `my-activities`

**Files:** `src/pages/discover.tsx`, `src/pages/my-activities.tsx`

Both pages share the same layout: `Group position="apart"` with `PageTitle` + optional create button + `Grid` with `Activity` or `EmptyData`. Extract to a reusable layout component.

```tsx
// src/components/ActivitiesLayout.tsx
import { Activity, EmptyData, PageTitle } from "@/components";
import { ActivityFragment } from "@/graphql/generated/types";
import { Button, Grid, Group } from "@mantine/core";
import Link from "next/link";

interface ActivitiesLayoutProps {
  title: string;
  activities: ActivityFragment[];
  showCreateButton?: boolean;
}

export function ActivitiesLayout({ title, activities, showCreateButton }: ActivitiesLayoutProps) {
  return (
    <>
      <Group position="apart">
        <PageTitle title={title} />
        {showCreateButton && (
          <Link href="/activities/create">
            <Button>Ajouter une activité</Button>
          </Link>
        )}
      </Group>
      <Grid>
        {activities.length > 0 ? (
          activities.map((activity) => <Activity activity={activity} key={activity.id} />)
        ) : (
          <EmptyData />
        )}
      </Grid>
    </>
  );
}
```

---

### P2-7 · Remove `typescript-resolvers` from codegen and fix schema source

**File:** `codegen.yml`

`typescript-resolvers` generates server-side resolver types (`QueryResolvers`, `MutationResolvers`, `Resolvers<ContextType = any>`) that have no use in a client-only app. They add `any`-heavy noise to the generated file.

The `schema` key points to `http://localhost:3000/graphql` (requires a running backend) while the `generate-types` script already copies `schema.gql` from the backend. Use the local file as the single source of truth.

```yaml
# codegen.yml
overwrite: true
schema: "./src/graphql/schema.gql"
documents:
  - "./src/graphql/**/*.ts"
generates:
  ./src/graphql/generated/types.ts:
    plugins:
      - typescript
      - typescript-operations
    config:
      gqlImport: "graphql-tag"
      scalars:
        DateTime: string
```

> Also set `scalars.DateTime: string` so `createdAt` fields are typed as `string` instead of `any`.

---

### P2-8 · Encode city name in URL

**File:** `src/components/City.tsx`

City names with `/`, spaces, or special characters will break the route.

```tsx
// src/components/City.tsx
<Link href={`/explorer/${encodeURIComponent(city)}`} className={classes.link}>
```

Also update `getServerSideProps` in `explorer/[city].tsx` to decode:

```ts
const cityName = decodeURIComponent(params.city);
```

---

## P3 — Consistency, Code Quality & Best Practices

---

### P3-1 · Fix all French copy inconsistencies

**Files:** `src/routes.ts`, `src/components/Form/SignupForm.tsx`, `src/components/City.tsx`, `src/pages/index.tsx`, `src/pages/_document.tsx`

```ts
// src/routes.ts
{ label: "Connexion", link: "/signin", requiredAuth: false },       // was "Connection"
{ label: "Déconnexion", link: "/logout", requiredAuth: true },      // was "Déconnection"
```

```tsx
// src/components/Form/SignupForm.tsx — translate form labels
<TextInput label="Prénom" placeholder="Jean" {...form.getInputProps("firstName")} />
<TextInput label="Nom" placeholder="Dupont" {...form.getInputProps("lastName")} />
```

```tsx
// src/components/City.tsx — remove lorem ipsum placeholder
<Text mt="md" sx={{ height: "3rem" }} className={classes.ellipsis}>
  Découvrez les activités disponibles dans cette ville.
</Text>
```

```tsx
// src/pages/index.tsx — replace default Next.js meta
<meta name="description" content="Découvrez et partagez des activités près de chez vous." />
```

```tsx
// src/pages/_document.tsx — fix HTML lang attribute
<Html lang="fr">
```

---

### P3-2 · Align form component export style (default → named)

**Files:** `src/components/Form/SigninForm.tsx`, `src/components/Form/SignupForm.tsx`, `src/components/Form/ActivityForm.tsx`

All other components in the project use named exports (`export function Activity`, `export function City`). The three form components use default exports. This breaks tree-shaking assumptions and is inconsistent with the barrel pattern in `components/index.ts`.

```tsx
// src/components/Form/ActivityForm.tsx
export function ActivityForm() { ... }

// src/components/Form/SigninForm.tsx
export function SigninForm() { ... }

// src/components/Form/SignupForm.tsx
export function SignupForm() { ... }
```

Update `components/Form/index.ts` (or add it if missing):

```ts
// src/components/Form/index.ts
export * from "./ActivityForm";
export * from "./SigninForm";
export * from "./SignupForm";
export * from "./validationRules";
```

And update import in `src/pages/activities/create.tsx`:

```tsx
import { ActivityForm } from "@/components/Form";
// or via barrel:
import { ActivityForm } from "@/components";
```

---

### P3-3 · Align GraphQL file naming conventions

**Problem:** GraphQL document files mix naming styles:

| File | Style |
|---|---|
| `queries/activity/getActivities.ts` | camelCase export, PascalCase const |
| `mutations/auth/signin.ts` | PascalCase const (`Signin`) |
| `mutations/auth/signup.ts` | PascalCase const (`Signup`) |
| `mutations/activity/createActivity.ts` | PascalCase const (`CreateActivity`) |
| `fragments/activity.ts` | PascalCase const (`ActivityFragment`) |
| `fragments/owner.ts` | PascalCase const (`OwnerFragment`) |

The query/mutation files are consistent internally. The main issue is that `createActivity` mutation duplicates the `ActivityFragment` field selection instead of reusing it:

```ts
// src/graphql/mutations/activity/createActivity.ts
import ActivityFragment from "@/graphql/fragments/activity";
import gql from "graphql-tag";

const CreateActivity = gql`
  mutation CreateActivity($createActivityInput: CreateActivityInput!) {
    createActivity(createActivityInput: $createActivityInput) {
      ...Activity
    }
  }
  ${ActivityFragment}
`;

export default CreateActivity;
```

---

### P3-4 · Validate password strength in `validationRules.ts`

**File:** `src/components/Form/validationRules.ts`

Password validation is "non-empty" only. No minimum length, no complexity. Validation messages mix French and English.

```ts
// src/components/Form/validationRules.ts

export const passwordValidation: ValidationRule<string> = (value) => {
  if (value.length < 8) return "Le mot de passe doit contenir au moins 8 caractères";
  return null;
};

export const firstNameValidation: ValidationRule<string> = (value) =>
  value.trim().length > 0 ? null : "Le prénom est requis";

export const lastNameValidation: ValidationRule<string> = (value) =>
  value.trim().length > 0 ? null : "Le nom est requis";

export const nameValidation: ValidationRule<string> = (value) =>
  value.trim().length > 0 ? null : "Le nom est requis";

export const descriptionValidation: ValidationRule<string> = (value) =>
  value.trim().length > 0 ? null : "La description est requise";

export const cityValidation: ValidationRule<string> = (value) =>
  value.trim().length > 0 ? null : "La localisation est requise";
```

---

### P3-5 · Fix branding inconsistency across pages

**Files:** `src/components/Topbar/Topbar.tsx` (shows "Candidator"), all `<title>` tags (show "CDTR")

Pick one and apply consistently. Example: keep "Candidator" as the brand name.

```tsx
// All page <title> tags — change "CDTR" to "Candidator"
<title>Accueil | Candidator</title>
<title>Découvrir | Candidator</title>
<title>Mon profil | Candidator</title>
// etc.
```

---

### P3-6 · Remove `useDebounced` in favour of `@mantine/hooks` `useDebouncedValue`

**File:** `src/hooks/useDebounced.ts`

`@mantine/hooks` is already a dependency and provides `useDebouncedValue`, which is identical to the custom `useDebounced` hook. The custom hook is redundant.

```ts
// Before (in any file using useDebounced)
import { useDebounced } from "@/hooks";
const debouncedValue = useDebounced(value, 300);

// After
import { useDebouncedValue } from "@mantine/hooks";
const [debouncedValue] = useDebouncedValue(value, 300);
```

Then delete `src/hooks/useDebounced.ts` and remove it from `src/hooks/index.ts` (if a barrel exists).

---

### P3-7 · Fix `Topbar` incomplete mobile nav (dead `opened` state)

**File:** `src/components/Topbar/Topbar.tsx`

`useDisclosure` tracks `opened` but nothing in the component tree renders a mobile drawer when `opened` is true. The `Burger` button is therefore non-functional.

Either implement the drawer or remove the dead state:

```tsx
// Option A — remove until mobile nav is implemented
export function Topbar({ routes }: TopbarProps) {
  const { classes } = useTopbarStyles();
  const { user } = useAuth();
  const filteredRoutes = getFilteredRoutes(routes, user);

  return (
    <Header height={56} className={classes.header}>
      <Container>
        <div className={classes.inner}>
          <Link href="/" className={classes.mainLink}>
            <h1 className={classes.title} data-testid="header">Candidator</h1>
          </Link>
          <Group spacing={5} className={classes.links}>
            {filteredRoutes.map((route) => (
              <MenuItem key={route.label} {...route} />
            ))}
          </Group>
          {/* Burger — mobile drawer not yet implemented */}
        </div>
      </Container>
    </Header>
  );
}
```

---

### P3-8 · Rename duplicate default export `ActivityDetails`

**Files:** `src/pages/activities/[id].tsx`, `src/pages/explorer/[city].tsx`

Both pages export `ActivityDetails` as the default. This makes stack traces and component inspector views ambiguous.

```tsx
// src/pages/activities/[id].tsx
export default function ActivityDetailPage({ activity }: ActivityDetailsProps) { ... }

// src/pages/explorer/[city].tsx
export default function CityExplorerPage({ activities, city }: CityDetailsProps) { ... }
```

---

### P3-9 · Add `index.ts` barrel to `hooks/` and `contexts/` directories

**Problem:** Some imports use direct paths (`@/contexts/authContext`), others might use barrel. There is no `hooks/index.ts` or `contexts/index.ts` making the import style inconsistent.

```ts
// src/hooks/index.ts
export * from "./useAuth";
export * from "./useSnackbar";
// Remove useDebounced after P3-6
```

```ts
// src/contexts/index.ts
export * from "./authContext";
export * from "./snackbarContext";
```

Then update `_app.tsx` and other consumers to import from `@/contexts` instead of `@/contexts/authContext`.

---

## Summary Table

| ID | Priority | File(s) | Issue |
|---|---|---|---|
| P0-1 | P0 | `pages/logout.tsx` | Side effect in render body |
| P0-2 | P0 | `graphql/apollo.ts` | Shared Apollo cache across SSR requests |
| P0-3 | P0 | `services/cities.ts` | Broken `City` import from `@/utils` |
| P0-4 | P0 | `contexts/authContext.tsx` | JWT in `localStorage` + unstable context value |
| P1-1 | P1 | `pages/explorer/[city].tsx` | `useSearchParams` from App Router in Pages Router |
| P1-2 | P1 | `contexts/snackbarContext.tsx` | Unstable context values + timer leak |
| P1-3 | P1 | `graphql/apollo.ts`, `services/axios.ts` | Hardcoded localhost URLs |
| P1-4 | P1 | `components/Form/ActivityForm.tsx` | `snackbar` in deps + no cache update after mutation |
| P1-5 | P1 | `vitest.config.ts` | Missing `@/*` path alias for tests |
| P1-6 | P1 | `PageTitle.test.tsx` | Synchronous `userEvent.click` (v14 requires async) |
| P2-1 | P2 | `pages/index.tsx`, `pages/discover.tsx` | `getServerSideProps` → ISR for public pages |
| P2-2 | P2 | `Activity.tsx`, `ActivityListItem.tsx`, `City.tsx`, `[id].tsx` | `Mantine Image` → `next/image` |
| P2-3 | P2 | `pages/profil.tsx` | Dead code (`favoriteActivities`, unused imports) |
| P2-4 | P2 | `hocs/withAuth.tsx`, `hocs/withoutAuth.tsx` | `ComponentType<any>` → generics |
| P2-5 | P2 | `hooks/useAuth.ts`, `hooks/useSnackbar.ts` | No dev-time guard outside provider |
| P2-6 | P2 | `pages/discover.tsx`, `pages/my-activities.tsx` | Duplicated layout → `ActivitiesLayout` |
| P2-7 | P2 | `codegen.yml` | Remove `typescript-resolvers`; fix schema source + DateTime scalar |
| P2-8 | P2 | `components/City.tsx`, `pages/explorer/[city].tsx` | City name not URL-encoded |
| P3-1 | P3 | `routes.ts`, `SignupForm.tsx`, `City.tsx`, `index.tsx`, `_document.tsx` | French copy errors, lorem ipsum, wrong `lang` attribute |
| P3-2 | P3 | `Form/SigninForm.tsx`, `SignupForm.tsx`, `ActivityForm.tsx` | Default exports → named exports |
| P3-3 | P3 | `mutations/activity/createActivity.ts` | Inline fields → use `ActivityFragment` |
| P3-4 | P3 | `Form/validationRules.ts` | Weak password validation, mixed-language error messages |
| P3-5 | P3 | All `<title>` tags | "CDTR" vs "Candidator" branding inconsistency |
| P3-6 | P3 | `hooks/useDebounced.ts` | Redundant — replace with `useDebouncedValue` from `@mantine/hooks` |
| P3-7 | P3 | `Topbar/Topbar.tsx` | Dead `opened` state (no mobile drawer implemented) |
| P3-8 | P3 | `pages/activities/[id].tsx`, `pages/explorer/[city].tsx` | Duplicate default export name `ActivityDetails` |
| P3-9 | P3 | `hooks/`, `contexts/` | Missing barrel `index.ts` files for consistent imports |
