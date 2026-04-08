import { createStyles, rem } from "@mantine/core";

export const useTopbarStyles = createStyles((theme) => ({
  header: {
    backgroundColor: theme.fn.variant({
      variant: "filled",
      color: theme.primaryColor,
    }).background,
    borderBottom: 0,
  },

  title: {
    color: theme.white,
  },

  inner: {
    height: rem(56),
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  links: {
    [theme.fn.smallerThan("sm")]: {
      display: "none",
    },
  },

  burger: {
    [theme.fn.largerThan("sm")]: {
      display: "none",
    },
  },

  hiddenDesktop: {
    [theme.fn.largerThan("sm")]: {
      display: "none",
    },
  },

  drawerLink: {
    display: "flex",
    alignItems: "center",
    borderRadius: theme.radius.sm,
    padding: `${rem(8)} ${rem(12)}`,
    textDecoration: "none",
    color: theme.colorScheme === "dark" ? theme.colors.dark[0] : theme.black,
    fontSize: theme.fontSizes.sm,
    fontWeight: 500,

    "&:hover": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[6]
          : theme.colors.gray[0],
    },
  },

  drawerSubLink: {
    display: "flex",
    alignItems: "center",
    borderRadius: theme.radius.sm,
    padding: `${rem(6)} ${rem(12)} ${rem(6)} ${rem(24)}`,
    textDecoration: "none",
    color: theme.colorScheme === "dark" ? theme.colors.dark[1] : theme.colors.gray[7],
    fontSize: theme.fontSizes.sm,
    fontWeight: 400,

    "&:hover": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[6]
          : theme.colors.gray[0],
    },
  },

  drawerChevron: {
    transition: "transform 200ms ease",
  },

  mainLink: {
    textDecoration: "none",
  },

  menuItemLink: {
    textDecoration: "none",
    color: theme.black,
  },

  link: {
    display: "block",
    lineHeight: 1,
    padding: `${rem(8)} ${rem(12)}`,
    borderRadius: theme.radius.sm,
    textDecoration: "none",
    color: theme.white,
    fontSize: theme.fontSizes.sm,
    fontWeight: 500,

    "&:hover": {
      backgroundColor: theme.fn.lighten(
        theme.fn.variant({ variant: "filled", color: theme.primaryColor })
          .background!,
        0.1
      ),
    },
  },

  linkLabel: {
    marginRight: rem(5),
  },
}));
