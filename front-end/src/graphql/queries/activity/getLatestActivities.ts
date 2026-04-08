import { ActivityFragment } from "@/graphql/fragments/activity";
import gql from "graphql-tag";

const GetLatestActivities = gql`
  query GetLatestActivities {
    getLatestActivities {
      ...Activity
    }
  }
  ${ActivityFragment}
`;

export default GetLatestActivities;
