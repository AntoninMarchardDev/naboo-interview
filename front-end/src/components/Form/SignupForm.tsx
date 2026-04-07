import { useAuth } from "@/hooks";
import { Box, Button, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import Link from "next/link";
import {
  emailValidation,
  firstNameValidation,
  lastNameValidation,
  passwordValidation,
} from "./validationRules";
import { SignUpInput } from "@/graphql/generated/types";

export function SignupForm() {
  const { handleSignup, isLoading } = useAuth();
  const form = useForm<SignUpInput>({
    initialValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    },
    validate: {
      email: emailValidation,
      password: passwordValidation,
      firstName: firstNameValidation,
      lastName: lastNameValidation,
    },
  });

  return (
    <Box maw={450} mx="auto">
      <form onSubmit={form.onSubmit((values) => handleSignup(values))}>
        <TextInput
          withAsterisk
          label="Email"
          placeholder="your@email.com"
          {...form.getInputProps("email")}
        />
        <TextInput
          withAsterisk
          label="Mot de passe"
          placeholder="*****"
          type="password"
          {...form.getInputProps("password")}
        />
        <TextInput
          withAsterisk
          label="Prénom"
          placeholder="Jean"
          {...form.getInputProps("firstName")}
        />
        <TextInput
          withAsterisk
          label="Nom"
          placeholder="Dupont"
          {...form.getInputProps("lastName")}
        />
        <Box mt="md" sx={{ display: "flex", justifyContent: "space-between" }}>
          <Link href="/signin">
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <span>Vous avez déjà un compte ?</span>
              <span>Se connecter</span>
            </Box>
          </Link>
          <Button loading={isLoading} type="submit">
            Valider
          </Button>
        </Box>
      </form>
    </Box>
  );
}
