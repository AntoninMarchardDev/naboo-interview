import { ActivityFragment, Favorite, User } from "@/graphql/generated/types";
import AddToFavorite from "@/graphql/mutations/favorite/addToFavorite";
import RemoveFromFavorite from "@/graphql/mutations/favorite/removeFromFavorite";
import GetFavoritesByUser from "@/graphql/queries/favorite/getFavoritesByUser";
import { useAuth } from "@/hooks";
import { useGlobalStyles } from "@/utils";
import { Reference, useMutation, useQuery } from "@apollo/client";
import { IconHeart, IconHeartFilled } from "@tabler/icons-react";
import { useRef } from "react";

export function ActivityFavoriteButton({
  activity,
}: {
  activity: ActivityFragment;
}) {
  const heartRef = useRef<HTMLSpanElement>(null);
  const { user } = useAuth();

  const { classes } = useGlobalStyles();

  const [addFavorite, { loading: addFavoriteLoading }] =
    useMutation(AddToFavorite);
  const [removeFavorite, { loading: removeFavoriteLoading }] =
    useMutation(RemoveFromFavorite);
  const { data } = useQuery(GetFavoritesByUser, {
    skip: !user,
    fetchPolicy: "cache-and-network",
  });

  const isFavorited =
    data?.getFavorites.some((f: Favorite) => f.activity.id === activity.id) ??
    false;

  const triggerAnimation = () => {
    const el = heartRef.current;
    if (!el) return;
    el.classList.remove(classes.heartPop);
    void el.offsetWidth; // force reflow pour re-déclencher si double-click
    el.classList.add(classes.heartPop);
  };

  const handleToggle = () => {
    if (!user || addFavoriteLoading || removeFavoriteLoading) return;

    triggerAnimation();

    if (isFavorited) {
      removeFavorite({
        variables: { removeFromFavoriteInput: { activityId: activity.id } },
        update(cache) {
          cache.modify({
            fields: {
              getFavorites(existing: readonly Reference[] = [], { readField }) {
                return existing.filter(
                  (f) =>
                    readField("id", readField("activity", f)) !== activity.id,
                );
              },
            },
          });
        },
      });
    } else {
      addFavorite({
        variables: { addToFavoriteInput: { activityId: activity.id } },
        update(cache, { data }) {
          const newFavorite = data?.addFavorite;
          if (!newFavorite) return;
          cache.modify({
            fields: {
              getFavorites(existing = []) {
                return [...existing, newFavorite];
              },
            },
          });
        },
      });
    }
  };
  return (
    <span
      ref={heartRef}
      onClick={handleToggle}
      style={{ cursor: "pointer", display: "inline-flex" }}
    >
      {isFavorited ? (
        <IconHeartFilled style={{ color: "#e64980" }} />
      ) : (
        <IconHeart style={{ color: "#e64980" }} />
      )}
    </span>
  );
}
