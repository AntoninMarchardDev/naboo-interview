import { useAuth } from "@/hooks";
import { Box, Loader } from "@mantine/core";
import { useRouter } from "next/router";
import { ComponentType, useEffect } from "react";

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
