import { FavoriteWithActivityFragment } from "@/graphql/fragments/favorite";
import gql from "graphql-tag";

const GetMyFavoritesWithActivities = gql`
  query GetMyFavoritesWithActivities {
    getFavorites {
      ...FavoriteWithActivity
    }
  }
  ${FavoriteWithActivityFragment}
`;

export default GetMyFavoritesWithActivities;
