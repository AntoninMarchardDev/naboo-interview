import { ActivitiesLayout } from "@/components";
import { getApolloClient } from "@/graphql/apollo";
import {
  GetActivitiesQuery,
  GetActivitiesQueryVariables,
} from "@/graphql/generated/types";
import GetActivities from "@/graphql/queries/activity/getActivities";
import { useAuth } from "@/hooks";
import { GetStaticProps } from "next";
import Head from "next/head";

interface DiscoverProps {
  activities: GetActivitiesQuery["getActivities"];
}

export const getStaticProps: GetStaticProps<DiscoverProps> = async () => {
  const client = getApolloClient();
  const response = await client.query<
    GetActivitiesQuery,
    GetActivitiesQueryVariables
  >({
    query: GetActivities,
  });
  return {
    props: { activities: response.data.getActivities },
    revalidate: 30,
  };
};

export default function Discover({ activities }: DiscoverProps) {
  const { user } = useAuth();

  return (
    <>
      <Head>
        <title>Discover | Candidator</title>
      </Head>
      <ActivitiesLayout
        title="Découvrez des activités"
        activities={activities}
        showCreateButton={!!user}
      />
    </>
  );
}
