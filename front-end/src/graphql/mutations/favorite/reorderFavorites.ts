import { FavoriteWithActivityFragment } from "@/graphql/fragments/favorite";
import gql from "graphql-tag";

const ReorderFavorites = gql`
  mutation ReorderFavorites($reorderFavoritesInput: ReorderFavoritesInput!) {
    reorderFavorites(reorderFavoritesInput: $reorderFavoritesInput) {
      ...FavoriteWithActivity
    }
  }
  ${FavoriteWithActivityFragment}
`;

export default ReorderFavorites;
