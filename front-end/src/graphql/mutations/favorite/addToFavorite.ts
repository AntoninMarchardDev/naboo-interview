import FavoriteFragment from "@/graphql/fragments/favorite";
import gql from "graphql-tag";

const AddToFavorite = gql`
  mutation AddToFavorite($addToFavoriteInput: AddToFavoriteInput!) {
    addFavorite(addToFavoriteInput: $addToFavoriteInput) {
      ...Favorite
    }
  }
  ${FavoriteFragment}
`;

export default AddToFavorite;
