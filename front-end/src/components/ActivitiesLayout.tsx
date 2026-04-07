import { Activity, EmptyData, PageTitle } from "@/components";
import { ActivityFragment } from "@/graphql/generated/types";
import { Button, Grid, Group } from "@mantine/core";
import Link from "next/link";

interface ActivitiesLayoutProps {
  title: string;
  activities: ActivityFragment[];
  showCreateButton?: boolean;
}

export function ActivitiesLayout({ title, activities, showCreateButton }: ActivitiesLayoutProps) {
  return (
    <>
      <Group position="apart">
        <PageTitle title={title} />
        {showCreateButton && (
          <Link href="/activities/create">
            <Button>Ajouter une activité</Button>
          </Link>
        )}
      </Group>
      <Grid>
        {activities.length > 0 ? (
          activities.map((activity) => <Activity activity={activity} key={activity.id} />)
        ) : (
          <EmptyData />
        )}
      </Grid>
    </>
  );
}
