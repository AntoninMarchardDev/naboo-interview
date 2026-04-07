import { PageTitle } from "@/components";
import { ActivityForm } from "@/components/Form";
import { withAuth } from "@/hocs";
import { Paper } from "@mantine/core";
import Head from "next/head";

const CreateActivity = () => {
  return (
    <>
      <Head>
        <title>Ajouter une activité | Candidator</title>
      </Head>
      <PageTitle title="Ajouter une activité" prevPath="/discover" />
      <Paper shadow="xs" p="md">
        <ActivityForm />
      </Paper>
    </>
  );
};

export default withAuth(CreateActivity);
