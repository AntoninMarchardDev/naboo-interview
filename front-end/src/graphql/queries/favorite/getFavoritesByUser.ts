import FavoriteFragment from "@/graphql/fragments/favorite";
import gql from "graphql-tag";

const GetFavoritesByUser = gql`
  query GetFavoritesByUser {
    getFavorites {
      ...Favorite
    }
  }
  ${FavoriteFragment}
`;

export default GetFavoritesByUser;
