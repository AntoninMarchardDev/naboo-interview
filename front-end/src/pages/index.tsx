import { ActivitiesLayout, Activity, PageTitle } from "@/components";
import { getApolloClient } from "@/graphql/apollo";
import { useGlobalStyles } from "@/utils";
import { Button, Flex, Grid, Text } from "@mantine/core";
import { GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import {
  GetLatestActivitiesQuery,
  GetLatestActivitiesQueryVariables,
} from "@/graphql/generated/types";
import GetLatestActivities from "@/graphql/queries/activity/getLatestActivities";

interface HomeProps {
  activities: GetLatestActivitiesQuery["getLatestActivities"];
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  const client = getApolloClient();
  const response = await client.query<
    GetLatestActivitiesQuery,
    GetLatestActivitiesQueryVariables
  >({
    query: GetLatestActivities,
  });

  return {
    props: { activities: response.data.getLatestActivities },
    revalidate: 60,
  };
};

export default function Home({ activities }: HomeProps) {
  const { classes } = useGlobalStyles();

  return (
    <>
      <Head>
        <title>Accueil | Candidator</title>
        <meta
          name="description"
          content="Découvrez et partagez des activités près de chez vous."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <PageTitle title="Accueil" />
        <Text>
          Sed ut perspiciatis unde omnis iste natus error sit voluptatem
          accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae
          ab illo inventore veritatis et quasi architecto beatae vitae dicta
          sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit
          aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos
          qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui
          dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed
          quia non numquam eius modi tempora incidunt ut labore et dolore magnam
          aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum
          exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex
          ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in
          ea voluptate velit esse quam nihil molestiae consequatur, vel illum
          qui dolorem eum fugiat quo voluptas nulla pariatur?
        </Text>
        {activities.length > 0 && (
          <>
            <Flex align="center" justify="space-between">
              <Link href={`/discover`} className={classes.link}>
                <Button
                  variant="outline"
                  color="dark"
                  fullWidth
                  mt="md"
                  radius="md"
                >
                  Voir plus
                </Button>
              </Link>
            </Flex>
            <ActivitiesLayout
              title="Découvrez les dernières activités"
              activities={activities}
              showCreateButton={false}
            />
          </>
        )}
      </main>
    </>
  );
}
