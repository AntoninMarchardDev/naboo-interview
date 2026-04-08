import { useAuth } from "@/hooks";
import {
  Burger,
  Container,
  Divider,
  Drawer,
  Group,
  Header,
  ScrollArea,
  Stack,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import Link from "next/link";
import { MenuItem } from "./MenuItem";
import { DrawerMenuItem } from "./DrawerMenuItem";
import { useTopbarStyles } from "./Topbar.styles";
import { getFilteredRoutes } from "./getFilteredRoutes";
import { Route } from "./types";

interface TopbarProps {
  routes: Route[];
}

export function Topbar({ routes }: TopbarProps) {
  const { classes } = useTopbarStyles();
  const { user } = useAuth();
  const filteredRoutes = getFilteredRoutes(routes, user);
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] =
    useDisclosure(false);

  return (
    <>
      <Header height={56} className={classes.header}>
        <Container>
          <div className={classes.inner}>
            <Link href="/" className={classes.mainLink}>
              <h1 className={classes.title} data-testid="header">
                Candidator
              </h1>
            </Link>
            <Group spacing={5} className={classes.links}>
              {filteredRoutes.map((route) => (
                <MenuItem key={route.label} {...route} />
              ))}
            </Group>
            <Burger
              opened={drawerOpened}
              onClick={toggleDrawer}
              className={classes.burger}
              size="sm"
              color="white"
            />
          </div>
        </Container>
      </Header>

      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        size="100%"
        padding="md"
        title="Candidator"
        className={classes.hiddenDesktop}
        zIndex={1000000}
      >
        <ScrollArea h="calc(100vh - 60px)" mx="-md">
          <Divider my="sm" />
          <Stack spacing={0} px="md">
            {filteredRoutes.map((route) => (
              <DrawerMenuItem
                key={route.label}
                {...route}
                onNavigate={closeDrawer}
              />
            ))}
          </Stack>
          <Divider my="sm" />
        </ScrollArea>
      </Drawer>
    </>
  );
}
