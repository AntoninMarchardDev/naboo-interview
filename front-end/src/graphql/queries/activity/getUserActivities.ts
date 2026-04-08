import { ActivityWithOwnerFragment } from "@/graphql/fragments/activity";
import gql from "graphql-tag";

const GetUserActivities = gql`
  query GetUserActivities {
    getActivitiesByUser {
      ...ActivityWithOwner
    }
  }
  ${ActivityWithOwnerFragment}
`;

export default GetUserActivities;
