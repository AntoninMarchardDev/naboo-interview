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
import { useMutation, useQuery } from "@apollo/client";
import { useRouter } from "next/router";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [user, setUser] = useState<GetUserQuery["getMe"] | null>(null);
  const router = useRouter();

  const { loading: isSessionLoading, refetch } = useQuery<
    GetUserQuery,
    GetUserQueryVariables
  >(GetUser, {
    errorPolicy: "ignore",
    onCompleted: (data) => {
      setUser(data?.getMe ?? null);
    },
  });

  const [signin] = useMutation<SigninMutation, SigninMutationVariables>(Signin);
  const [signup] = useMutation<SignupMutation, SignupMutationVariables>(Signup);
  const [logout] = useMutation<LogoutMutation, LogoutMutationVariables>(Logout);

  const isLoading = isSessionLoading || isActionLoading;

  const handleSignin = useCallback(
    async (input: SignInInput) => {
      try {
        setIsActionLoading(true);
        await signin({ variables: { signInInput: input } });

        const { data } = await refetch();
        setUser(data?.getMe ?? null);
        router.push("/profil");
      } catch {
        snackbar.error("Une erreur est survenue");
      } finally {
        setIsActionLoading(false);
      }
    },
    [signin, refetch, router, snackbar],
  );

  const handleSignup = useCallback(
    async (input: SignUpInput) => {
      try {
        setIsActionLoading(true);
        await signup({ variables: { signUpInput: input } });
        router.push("/signin");
      } catch {
        snackbar.error("Une erreur est survenue");
      } finally {
        setIsActionLoading(false);
      }
    },
    [signup, router, snackbar],
  );

  const handleLogout = useCallback(async () => {
    try {
      setIsActionLoading(true);
      await logout();
      setUser(null);
      await getApolloClient().clearStore();
      router.push("/");
    } catch {
      snackbar.error("Une erreur est survenue");
    } finally {
      setIsActionLoading(false);
    }
  }, [logout, router, snackbar, setUser]);

  const value = useMemo(
    () => ({ user, isLoading, handleSignin, handleSignup, handleLogout }),
    [user, isLoading, handleSignin, handleSignup, handleLogout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
