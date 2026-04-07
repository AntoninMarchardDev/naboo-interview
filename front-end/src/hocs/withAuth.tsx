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
