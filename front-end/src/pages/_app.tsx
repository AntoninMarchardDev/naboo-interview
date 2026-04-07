import { Topbar } from "@/components";
import { AuthProvider, SnackbarProvider } from "@/contexts";
import { routes } from "@/routes";
import { getApolloClient } from "@/graphql/apollo";
import { mantineTheme } from "@/utils";
import { ApolloProvider } from "@apollo/client";
import { Container, MantineProvider } from "@mantine/core";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MantineProvider withGlobalStyles withNormalizeCSS theme={mantineTheme}>
      <SnackbarProvider>
        <ApolloProvider client={getApolloClient()}>
          <AuthProvider>
            <Topbar routes={routes} />
            <Container>
              <Component {...pageProps} />
            </Container>
          </AuthProvider>
        </ApolloProvider>
      </SnackbarProvider>
    </MantineProvider>
  );
}
