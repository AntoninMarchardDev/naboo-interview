import { ActivityWithOwnerFragment } from "@/graphql/fragments/activity";
import gql from "graphql-tag";

const CreateActivity = gql`
  mutation CreateActivity($createActivityInput: CreateActivityInput!) {
    createActivity(createActivityInput: $createActivityInput) {
      ...Activity
    }
  }
  ${ActivityWithOwnerFragment}
`;

export default CreateActivity;
