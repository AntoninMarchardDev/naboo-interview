import { ActivityWithOwnerFragment } from "@/graphql/fragments/activity";
import gql from "graphql-tag";

const GetActivity = gql`
  query GetActivity($id: String!) {
    getActivity(id: $id) {
      ...ActivityWithOwner
    }
  }
  ${ActivityWithOwnerFragment}
`;

export default GetActivity;
