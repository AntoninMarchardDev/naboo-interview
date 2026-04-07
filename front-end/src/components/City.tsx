import { useGlobalStyles } from "@/utils";
import { Card, Text } from "@mantine/core";
import Image from "next/image";
import Link from "next/link";

interface CityProps {
  city: string;
}

export function City({ city }: CityProps) {
  const { classes } = useGlobalStyles();

  return (
    <Link href={`/explorer/${encodeURIComponent(city)}`} className={classes.link}>
      <Card
        shadow="sm"
        padding="lg"
        radius="md"
        withBorder
        sx={{ width: "100%" }}
      >
        <Card.Section style={{ position: "relative", height: 160 }}>
          <Image
            src="https://dummyimage.com/480x360"
            fill
            style={{ objectFit: "cover" }}
            alt="city thumbnail"
          />
        </Card.Section>
        <Text mt="md" weight="bold">
          {city}
        </Text>
        <Text mt="md" sx={{ height: "3rem" }} className={classes.ellipsis}>
          Découvrez les activités disponibles dans cette ville.
        </Text>
      </Card>
    </Link>
  );
}
