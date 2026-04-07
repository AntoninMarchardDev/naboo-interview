import { ActivitiesLayout } from "@/components";
import { getApolloClient } from "@/graphql/apollo";
import {
  GetUserActivitiesQuery,
  GetUserActivitiesQueryVariables,
} from "@/graphql/generated/types";
import GetUserActivities from "@/graphql/queries/activity/getUserActivities";
import { withAuth } from "@/hocs";
import { GetServerSideProps } from "next";
import Head from "next/head";

interface MyActivitiesProps {
  activities: GetUserActivitiesQuery["getActivitiesByUser"];
}

export const getServerSideProps: GetServerSideProps<
  MyActivitiesProps
> = async ({ req }) => {
  const client = getApolloClient();
  const response = await client.query<
    GetUserActivitiesQuery,
    GetUserActivitiesQueryVariables
  >({
    query: GetUserActivities,
    context: { headers: { Cookie: req.headers.cookie } },
  });
  return { props: { activities: response.data.getActivitiesByUser } };
};

const MyActivities = ({ activities }: MyActivitiesProps) => {
  return (
    <>
      <Head>
        <title>Mes activités | CDTR</title>
      </Head>
      <ActivitiesLayout
        title="Mes activités"
        activities={activities}
        showCreateButton
      />
    </>
  );
};

export default withAuth(MyActivities);
