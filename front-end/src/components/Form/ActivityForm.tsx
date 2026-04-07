import { useDebounced, useSnackbar } from "@/hooks";
import { searchCity } from "@/services";
import { Box, Button, Group, Select, TextInput, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  cityValidation,
  descriptionValidation,
  nameValidation,
  priceValidation,
} from "./validationRules";
import { useMutation } from "@apollo/client";
import CreateActivity from "@/graphql/mutations/activity/createActivity";
import {
  CreateActivityInput,
  CreateActivityMutation,
  CreateActivityMutationVariables,
} from "@/graphql/generated/types";

type SelectData = {
  value: string;
  label: string;
};

export function ActivityForm() {
  const snackbar = useSnackbar();
  const [searchValue, setSearchValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearch = useDebounced(searchValue, 300);
  const [displayedCities, setDisplayedCities] = useState<SelectData[]>([]);
  const router = useRouter();

  const [createActivity] = useMutation<
    CreateActivityMutation,
    CreateActivityMutationVariables
  >(CreateActivity, {
    refetchQueries: ["GetActivities", "GetUserActivities"],
    onError: () => snackbar.error("Une erreur est survenue"),
  });

  const form = useForm<CreateActivityInput>({
    initialValues: {
      name: "",
      description: "",
      city: "",
      price: 0,
    },
    validate: {
      name: nameValidation,
      description: descriptionValidation,
      city: cityValidation,
      price: priceValidation,
    },
  });

  useEffect(() => {
    if (!debouncedSearch) return;
    searchCity(debouncedSearch)
      .then((data) => setDisplayedCities(data.map((d) => ({ value: d.nom, label: d.nom }))))
      .catch((err) => snackbar.error(err?.message ?? "Une erreur est survenue"));
  }, [debouncedSearch]); // snackbar is stable after P1-2; searchValue is already captured by debouncedSearch

  const handleSubmit = async (values: CreateActivityInput) => {
    try {
      setIsLoading(true);
      await createActivity({
        variables: {
          createActivityInput: { ...values, price: Number(values.price) },
        },
      });
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box maw={450} mx="auto">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          withAsterisk
          label="Nom de l'activité"
          placeholder="Session Yoga"
          {...form.getInputProps("name")}
        />
        <Textarea
          withAsterisk
          label="Description"
          placeholder="Description de l'activité"
          {...form.getInputProps("description")}
        />
        <Select
          withAsterisk
          label="Localisation"
          placeholder="Rouen"
          searchable
          onSearchChange={setSearchValue}
          searchValue={searchValue}
          data={displayedCities}
          {...form.getInputProps("city")}
        />
        <TextInput
          withAsterisk
          label="Prix"
          placeholder="50"
          type="number"
          {...form.getInputProps("price")}
        />
        <Group position="right" mt="md">
          <Button loading={isLoading} type="submit">
            Valider
          </Button>
        </Group>
      </form>
    </Box>
  );
}
