import { AuthContext } from "@/contexts/authContext";
import { useContext } from "react";

export function useAuth() {
  const context = useContext(AuthContext);
  if (process.env.NODE_ENV !== "production" && !context) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return context;
}
