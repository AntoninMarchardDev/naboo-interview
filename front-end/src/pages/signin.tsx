import { PageTitle, SigninForm } from "@/components";
import { withoutAuth } from "@/hocs";
import { Paper } from "@mantine/core";
import Head from "next/head";

const Signin = () => {
  return (
    <>
      <Head>
        <title>Connexion | Candidator</title>
      </Head>
      <PageTitle title="Connexion" />
      <Paper shadow="xs" p="md">
        <SigninForm />
      </Paper>
    </>
  );
};

export default withoutAuth(Signin);
