import { Box, Collapse, Group, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown } from "@tabler/icons-react";
import Link from "next/link";
import { useTopbarStyles } from "./Topbar.styles";
import { Route } from "./types";

interface DrawerMenuItemProps extends Route {
  onNavigate: () => void;
}

export function DrawerMenuItem({
  route,
  label,
  icon,
  onNavigate,
}: DrawerMenuItemProps) {
  const Icon = icon;
  const { classes, cx } = useTopbarStyles();
  const [opened, { toggle }] = useDisclosure(false);

  if (typeof route === "string") {
    return (
      <Link href={route} className={classes.drawerLink} onClick={onNavigate}>
        <Group spacing={8}>
          {Icon && <Icon size="1.1rem" />}
          <span>{label}</span>
        </Group>
      </Link>
    );
  }

  return (
    <>
      <UnstyledButton className={classes.drawerLink} onClick={toggle}>
        <Group position="apart" sx={{ width: "100%" }}>
          <Group spacing={8}>
            {Icon && <Icon size="1.1rem" />}
            <span>{label}</span>
          </Group>
          <IconChevronDown
            size="0.9rem"
            stroke={1.5}
            className={cx(classes.drawerChevron, {
              [classes.drawerChevron]: !opened,
            })}
            style={{ transform: opened ? "rotate(-180deg)" : "rotate(0deg)" }}
          />
        </Group>
      </UnstyledButton>
      <Collapse in={opened}>
        <Box>
          {route.map((item) => (
            <Link
              key={item.link}
              href={item.link}
              className={classes.drawerSubLink}
              onClick={onNavigate}
            >
              {item.label}
            </Link>
          ))}
        </Box>
      </Collapse>
    </>
  );
}
