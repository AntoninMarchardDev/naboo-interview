import { createStyles, keyframes } from "@mantine/core";

const heartPop = keyframes({
  "0%": { transform: "scale(1)" },
  "50%": { transform: "scale(1.5)" },
  "100%": { transform: "scale(1)" },
});

export const useGlobalStyles = createStyles(() => ({
  link: {
    textDecoration: "none",
  },

  ellipsis: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  heartPop: {
    animation: `${heartPop} 0.3s ease`,
  },
}));
