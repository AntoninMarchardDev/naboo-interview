import { PageTitle, SignupForm } from "@/components";
import { withoutAuth } from "@/hocs";
import { Paper } from "@mantine/core";
import Head from "next/head";

const Signup = () => {
  return (
    <>
      <Head>
        <title>Inscription | Candidator</title>
      </Head>
      <PageTitle title="Inscription" />
      <Paper shadow="xs" p="md">
        <SignupForm />
      </Paper>
    </>
  );
};
export default withoutAuth(Signup);
