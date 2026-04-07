import { useAuth } from "@/hooks";
import { useEffect } from "react";

export default function Logout() {
  const { handleLogout } = useAuth();

  useEffect(() => {
    handleLogout();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
