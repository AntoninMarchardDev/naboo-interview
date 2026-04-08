import { ActivityFragment, Favorite, User } from "@/graphql/generated/types";
import GetFavoritesByUser from "@/graphql/queries/favorite/getFavoritesByUser";
import { useAuth } from "@/hooks";
import { useGlobalStyles } from "@/utils";
import { useQuery } from "@apollo/client";
import { Badge, Button, Card, Grid, Group, Text } from "@mantine/core";
import Image from "next/image";
import Link from "next/link";
import { ActivityFavoriteButton } from "./ActivityFavoriteButton";

interface ActivityProps {
  activity: ActivityFragment;
}

export function Activity({ activity }: ActivityProps) {
  const { classes } = useGlobalStyles();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <Grid.Col span={12} sm={6} lg={4}>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Card.Section style={{ position: "relative", height: 160 }}>
          <Image
            src="https://dummyimage.com/480x360"
            fill
            style={{ objectFit: "cover" }}
            alt="activity thumbnail"
          />
        </Card.Section>

        <Group position="apart" mt="md" mb="xs">
          <Text weight={500} className={classes.ellipsis}>
            {activity.name}
          </Text>
          <ActivityFavoriteButton activity={activity} />
        </Group>

        <Group mt="md" mb="xs">
          <Badge color="pink" variant="light">
            {activity.city}
          </Badge>
          <Badge color="yellow" variant="light">
            {`${activity.price}€/j`}
          </Badge>
          {isAdmin && activity.createdAt && (
            <Badge color="gray" variant="outline" size="xs">
              Debug: {new Date(activity.createdAt).toLocaleDateString()}
            </Badge>
          )}
        </Group>

        <Text size="sm" color="dimmed" className={classes.ellipsis}>
          {activity.description}
        </Text>

        <Link href={`/activities/${activity.id}`} className={classes.link}>
          <Button variant="light" color="blue" fullWidth mt="md" radius="md">
            Voir plus
          </Button>
        </Link>
      </Card>
    </Grid.Col>
  );
}
