import { City, EmptyData, PageTitle } from "@/components";
import { getApolloClient } from "@/graphql/apollo";
import {
  GetCitiesQuery,
  GetCitiesQueryVariables,
} from "@/graphql/generated/types";
import GetCities from "@/graphql/queries/city/getCities";
import { Grid } from "@mantine/core";
import { GetServerSideProps } from "next";
import Head from "next/head";

interface ExplorerProps {
  cities: GetCitiesQuery["getCities"];
}

export const getServerSideProps: GetServerSideProps<
  ExplorerProps
> = async () => {
  const client = getApolloClient();
  const response = await client.query<
    GetCitiesQuery,
    GetCitiesQueryVariables
  >({
    query: GetCities,
  });
  return { props: { cities: response.data.getCities } };
};

export default function Explorer({ cities }: ExplorerProps) {
  return (
    <>
      <Head>
        <title>Explorer | Candidator</title>
      </Head>
      <PageTitle title="Trouvez une activité dans votre ville" />
      <Grid>
        {cities.length > 0 ? (
          cities.map((city) => (
            <Grid.Col key={city} span={12} sm={6} lg={4}>
              <City city={city} />
            </Grid.Col>
          ))
        ) : (
          <Grid.Col span={12}>
            <EmptyData />
          </Grid.Col>
        )}
      </Grid>
    </>
  );
}
