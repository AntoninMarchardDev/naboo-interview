import { Activity, EmptyData, Filters, PageTitle } from "@/components";
import { getApolloClient } from "@/graphql/apollo";
import {
  GetActivitiesByCityQuery,
  GetActivitiesByCityQueryVariables,
} from "@/graphql/generated/types";
import GetActivitiesByCity from "@/graphql/queries/activity/getActivitiesByCity";
import { useDebouncedValue } from "@mantine/hooks";
import { Divider, Flex, Grid } from "@mantine/core";
import { GetServerSideProps } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { Fragment, useEffect, useState } from "react";

interface CityDetailsProps {
  activities: GetActivitiesByCityQuery["getActivitiesByCity"];
  city: string;
}

export const getServerSideProps: GetServerSideProps<CityDetailsProps> = async ({
  params,
  query,
}) => {
  if (!params?.city || Array.isArray(params.city)) return { notFound: true };

  if (
    (query.activity && Array.isArray(query.activity)) ||
    (query.price && Array.isArray(query.price))
  )
    return { notFound: true };

  const client = getApolloClient();
  const response = await client.query<
    GetActivitiesByCityQuery,
    GetActivitiesByCityQueryVariables
  >({
    query: GetActivitiesByCity,
    variables: {
      city: decodeURIComponent(params.city),
      activity: query.activity || null,
      price: query.price ? Number(query.price) : null,
    },
  });
  return {
    props: {
      activities: response.data.getActivitiesByCity,
      city: decodeURIComponent(params.city),
    },
  };
};

export default function CityExplorerPage({
  activities,
  city,
}: CityDetailsProps) {
  const router = useRouter();

  const [searchActivity, setSearchActivity] = useState<string | undefined>(
    typeof router.query.activity === "string"
      ? router.query.activity
      : undefined,
  );
  const [debouncedSearchActivity] = useDebouncedValue(searchActivity, 300);

  const [searchPrice, setSearchPrice] = useState<number | undefined>(
    typeof router.query.price === "string"
      ? Number(router.query.price)
      : undefined,
  );
  const [debouncedSearchPrice] = useDebouncedValue(searchPrice, 300);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearchActivity)
      params.set("activity", debouncedSearchActivity);
    if (debouncedSearchPrice !== undefined)
      params.set("price", String(debouncedSearchPrice));

    const query = params.toString();
    const nextUrl = `/explorer/${encodeURIComponent(city)}${query ? `?${query}` : ""}`;

    // Avoid pushing to history if the URL hasn't actually changed
    if (router.asPath !== nextUrl) {
      router.push(nextUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, debouncedSearchActivity, debouncedSearchPrice]);

  return (
    <>
      <Head>
        <title>{city} | Candidator</title>
      </Head>
      <PageTitle
        title={`Activités pour la ville de ${city}`}
        prevPath="/explorer"
      />
      <Grid>
        <Grid.Col span={4}>
          <Filters
            {...{
              activity: searchActivity,
              price: searchPrice,
              setSearchActivity,
              setSearchPrice,
            }}
          />
        </Grid.Col>
        <Grid.Col span={8}>
          <Flex direction="column" gap="lg">
            {activities.length > 0 ? (
              activities.map((activity, idx) => (
                <Fragment key={activity.id}>
                  <Activity activity={activity} />
                  {idx < activities.length - 1 && <Divider my="sm" />}
                </Fragment>
              ))
            ) : (
              <EmptyData />
            )}
          </Flex>
        </Grid.Col>
      </Grid>
    </>
  );
}
