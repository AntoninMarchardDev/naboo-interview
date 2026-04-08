import {
  ReorderFavoritesMutation,
  ReorderFavoritesMutationVariables,
  FavoriteWithActivityFragment,
} from "@/graphql/generated/types";
import ReorderFavorites from "@/graphql/mutations/favorite/reorderFavorites";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation } from "@apollo/client";
import { Grid, Title } from "@mantine/core";
import { useCallback, useRef, useState } from "react";
import { Activity } from "./Activity";
import { EmptyData } from "./EmptyData";

interface SortableActivityProps {
  favorite: FavoriteWithActivityFragment;
  onMount: (id: string, cardWidth: number) => void;
}

function SortableActivity({ favorite, onMount }: SortableActivityProps) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } =
    useSortable({ id: favorite.id });

  // Combined ref: hook up dnd-kit's setNodeRef and measure the card's inner width.
  // Grid.Col (colEl) wraps the Card; firstElementChild is the Card itself.
  const combinedRef = useCallback(
    (colEl: HTMLDivElement | null) => {
      setNodeRef(colEl);
      if (colEl?.firstElementChild) {
        onMount(favorite.id, (colEl.firstElementChild as HTMLElement).offsetWidth);
      }
    },
    // setNodeRef is stable; favorite.id and onMount are stable across renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [favorite.id],
  );

  return (
    <Activity
      ref={combinedRef}
      activity={favorite.activity}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        cursor: "grab",
      }}
      {...attributes}
      {...listeners}
    />
  );
}

interface FavoritesListProps {
  favorites: FavoriteWithActivityFragment[];
}

export function FavoritesList({ favorites: initialFavorites }: FavoritesListProps) {
  const [favorites, setFavorites] = useState(initialFavorites);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [overlayWidth, setOverlayWidth] = useState(0);

  // Card widths measured after mount — reliable, no dependency on dnd-kit rect timing
  const cardWidths = useRef<Map<string, number>>(new Map());
  const handleMount = useCallback((id: string, width: number) => {
    cardWidths.current.set(id, width);
  }, []);

  const [reorderFavorites] = useMutation<
    ReorderFavoritesMutation,
    ReorderFavoritesMutationVariables
  >(ReorderFavorites);

  // 8 px distance prevents accidental drags when clicking links/buttons
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const activeItem = activeId ? favorites.find((f) => f.id === activeId) : null;

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string);
    const width = cardWidths.current.get(active.id as string);
    if (width) setOverlayWidth(width);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = favorites.findIndex((f) => f.id === active.id);
    const newIndex = favorites.findIndex((f) => f.id === over.id);
    const reordered = arrayMove(favorites, oldIndex, newIndex);

    setFavorites(reordered);

    reorderFavorites({
      variables: {
        reorderFavoritesInput: {
          favorites: reordered.map((f, index) => ({ id: f.id, order: index })),
        },
      },
    });
  };

  return (
    <>
      <Title order={3} mt="xl" mb="md">
        Mes favoris
      </Title>
      {favorites.length === 0 ? (
        <Grid>
          <EmptyData />
        </Grid>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={favorites.map((f) => f.id)}
            strategy={rectSortingStrategy}
          >
            <Grid>
              {favorites.map((favorite) => (
                <SortableActivity key={favorite.id} favorite={favorite} onMount={handleMount} />
              ))}
            </Grid>
          </SortableContext>

          {/*
            asOverlay renders only the Card (no Grid.Col), so DragOverlay
            owns the width directly — no Grid gutter math to fight.
          */}
          <DragOverlay>
            {activeItem ? (
              <div style={{ width: overlayWidth, cursor: "grabbing" }}>
                <Activity activity={activeItem.activity} asOverlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </>
  );
}
