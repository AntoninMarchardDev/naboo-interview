import {
  GetUserQuery,
  GetUserQueryVariables,
  LogoutMutation,
  LogoutMutationVariables,
  SignInInput,
  SignUpInput,
  SigninMutation,
  SigninMutationVariables,
  SignupMutation,
  SignupMutationVariables,
} from "@/graphql/generated/types";
import Logout from "@/graphql/mutations/auth/logout";
import Signin from "@/graphql/mutations/auth/signin";
import Signup from "@/graphql/mutations/auth/signup";
import GetUser from "@/graphql/queries/auth/getUser";
import { getApolloClient } from "@/graphql/apollo";
import { useSnackbar } from "@/hooks";
import { useLazyQuery, useMutation } from "@apollo/client";
import { useRouter } from "next/router";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";

interface AuthContextType {
  user: GetUserQuery["getMe"] | null;
  isLoading: boolean;
  handleSignin: (input: SignInInput) => Promise<void>;
  handleSignup: (input: SignUpInput) => Promise<void>;
  handleLogout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  handleSignin: () => Promise.resolve(),
  handleSignup: () => Promise.resolve(),
  handleLogout: () => Promise.resolve(),
});

interface AuthProviderProps {
  children: React.ReactNode;
}

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
      await getApolloClient().clearStore();
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
