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
