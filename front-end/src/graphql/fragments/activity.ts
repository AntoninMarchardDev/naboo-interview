import gql from "graphql-tag";
import OwnerFragment from "./owner";

export const ActivityWithOwnerFragment = gql`
  fragment Activity on Activity {
    id
    city
    description
    name
    price
    owner {
      ...Owner
    }
  }
  ${OwnerFragment}
`;

export const ActivityFragment = gql`
  fragment Activity on Activity {
    id
    city
    description
    name
    price
  }
`;
