import { PageTitle } from "@/components";
import { getApolloClient } from "@/graphql/apollo";
import {
  GetActivityQuery,
  GetActivityQueryVariables,
  User,
} from "@/graphql/generated/types";
import GetActivity from "@/graphql/queries/activity/getActivity";
import { Badge, Flex, Grid, Group, Text } from "@mantine/core";
import Image from "next/image";
import { GetServerSideProps } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { ActivityFavoriteButton } from "@/components/ActivityFavoriteButton";
import { useAuth } from "@/hooks";

interface ActivityDetailsProps {
  activity: GetActivityQuery["getActivity"];
}

export const getServerSideProps: GetServerSideProps<
  ActivityDetailsProps
> = async ({ params, req }) => {
  if (!params?.id || Array.isArray(params.id)) return { notFound: true };
  const client = getApolloClient();
  const response = await client.query<
    GetActivityQuery,
    GetActivityQueryVariables
  >({
    query: GetActivity,
    variables: { id: params.id },
    context: { headers: { Cookie: req.headers.cookie } },
  });
  return { props: { activity: response.data.getActivity } };
};

export default function ActivityDetailPage({ activity }: ActivityDetailsProps) {
  const router = useRouter();

  const { user } = useAuth();

  return (
    <>
      <Head>
        <title>{activity.name} | Candidator</title>
      </Head>
      <PageTitle title={activity.name} prevPath={router.back} />
      <Grid>
        <Grid.Col span={7}>
          <div
            style={{
              position: "relative",
              width: "100%",
              height: 400,
              borderRadius: "var(--mantine-radius-md)",
              overflow: "hidden",
            }}
          >
            <Image
              src="https://dummyimage.com/640x480"
              fill
              style={{ objectFit: "cover" }}
              alt="activity image"
            />
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                padding: "10px",
              }}
            >
              <ActivityFavoriteButton activity={activity} />
            </div>
          </div>
        </Grid.Col>
        <Grid.Col span={5}>
          <Flex direction="column" gap="md">
            <Group mt="md" mb="xs">
              <Badge color="pink" variant="light">
                {activity.city}
              </Badge>
              <Badge color="yellow" variant="light">
                {`${activity.price}€/j`}
              </Badge>
            </Group>
            <Text size="sm">{activity.description}</Text>
            <Text size="sm" color="dimmed">
              Ajouté par {activity.owner.firstName} {activity.owner.lastName}
            </Text>
          </Flex>
        </Grid.Col>
      </Grid>
    </>
  );
}
