import { SnackbarContext } from "@/contexts/snackbarContext";
import { useContext } from "react";

export function useSnackbar() {
  const context = useContext(SnackbarContext);
  if (process.env.NODE_ENV !== "production" && !context) {
    throw new Error("useSnackbar must be used inside <SnackbarProvider>");
  }
  return context;
}
