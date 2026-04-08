import gql from "graphql-tag";
import FavoriteFragment from "@/graphql/fragments/favorite";

const RemoveFromFavorite = gql`
  mutation RemoveFromFavorite(
    $removeFromFavoriteInput: RemoveFromFavoriteInput!
  ) {
    removeFavorite(removeFromFavoriteInput: $removeFromFavoriteInput) {
      ...Favorite
    }
  }
  ${FavoriteFragment}
`;

export default RemoveFromFavorite;
