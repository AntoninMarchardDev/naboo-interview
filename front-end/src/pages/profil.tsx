import { FavoritesList, PageTitle } from "@/components";
import { FavoriteWithActivityFragment } from "@/graphql/generated/types";
import GetMyFavoritesWithActivities from "@/graphql/queries/favorite/getFavoritesWithActivities";
import { withAuth } from "@/hocs";
import { useAuth } from "@/hooks";
import { useQuery } from "@apollo/client";
import { Avatar, Flex, Text } from "@mantine/core";
import Head from "next/head";

const Profile = () => {
  const { user } = useAuth();

  const { data } = useQuery(GetMyFavoritesWithActivities, {
    skip: !user,
    fetchPolicy: "cache-and-network",
  });

  const favorites: FavoriteWithActivityFragment[] = data?.getFavorites ?? [];

  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "";

  return (
    <>
      <Head>
        <title>Mon profil | Candidator</title>
      </Head>
      <PageTitle title="Mon profil" />
      <Flex align="center" gap="md">
        <Avatar color="cyan" radius="xl" size="lg">
          {initials}
        </Avatar>
        <Flex direction="column">
          <Text>{user?.email}</Text>
          <Text>{user?.firstName}</Text>
          <Text>{user?.lastName}</Text>
        </Flex>
      </Flex>
      <FavoritesList key={favorites.length} favorites={favorites} />
    </>
  );
};

export default withAuth(Profile);
