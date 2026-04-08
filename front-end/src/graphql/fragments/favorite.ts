import gql from "graphql-tag";

const FavoriteFragment = gql`
  fragment Favorite on Favorite {
    id
    activity {
      id
    }
  }
`;

export const ActivityWithoutOwnerFragment = gql`
  fragment ActivityWithoutOwner on Activity {
    id
    city
    description
    name
    price
  }
`;

export const FavoriteWithActivityFragment = gql`
  fragment FavoriteWithActivity on Favorite {
    id
    activity {
      ...ActivityWithoutOwner
    }
  }
  ${ActivityWithoutOwnerFragment}
`;

export default FavoriteFragment;
