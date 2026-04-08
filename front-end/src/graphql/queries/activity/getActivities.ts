import { ActivityFragment } from "@/graphql/fragments/activity";
import gql from "graphql-tag";

const GetActivities = gql`
  query GetActivities {
    getActivities {
      ...Activity
    }
  }
  ${ActivityFragment}
`;

export default GetActivities;
