"use client";
import { useState, useTransition } from "react";
import type { TagGroup } from "@prisma/client";
import { surpriseFill } from "@/lib/plan/actions";
import { TAG_GROUP_LABELS } from "@/lib/recipes/tags";
import type { EmptyCoord } from "@/lib/plan/slots";

export type SurpriseTag = { id: string; name: string; group: TagGroup };

export default function SurpriseButton({
  weekStartKey,
  emptyCoords,
  tags,
}: {
  weekStartKey: string;
  emptyCoords: EmptyCoord[];
  tags: SurpriseTag[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const groups = Array.from(new Set(tags.map((t) => t.group)));

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function cancel() {
    setOpen(false);
    setSelectedTagIds(new Set());
  }

  function confirm() {
    startTransition(async () => {
      const tagIds = Array.from(selectedTagIds);
      await surpriseFill(weekStartKey, emptyCoords, tagIds.length > 0 ? { tagIds } : {});
      setOpen(false);
      setSelectedTagIds(new Set());
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={emptyCoords.length === 0}
        className="rounded-full bg-olive px-4 py-2 font-bold text-white disabled:opacity-50"
      >
        Surprise me
      </button>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border-2 border-buttercream bg-cream p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-xl text-canyon">Surprise me</h2>
        <button
          type="button"
          onClick={cancel}
          disabled={isPending}
          aria-label="Close"
          className="rounded-full border-2 border-buttercream px-3 py-1 disabled:opacity-50"
        >
          Close
        </button>
      </div>
      <p className="mt-2 text-sm text-ink/70">
        Fills {emptyCoords.length} empty slot{emptyCoords.length === 1 ? "" : "s"} with random recipes.
        Optionally narrow by tag first.
      </p>
      {groups.length > 0 && (
        <div className="mt-3 flex flex-col gap-3">
          {groups.map((g) => (
            <div key={g}>
              <p className="text-xs font-bold uppercase text-ink/60">{TAG_GROUP_LABELS[g]}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {tags
                  .filter((t) => t.group === g)
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTag(t.id)}
                      aria-pressed={selectedTagIds.has(t.id)}
                      className={`rounded-full px-3 py-1 text-sm ${
                        selectedTagIds.has(t.id) ? "bg-canyon text-white" : "border-2 border-buttercream"
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={confirm}
        disabled={isPending}
        className="mt-4 rounded-full bg-canyon px-4 py-2 font-bold text-white disabled:opacity-50"
      >
        {isPending ? "Filling…" : "Surprise me"}
      </button>
    </div>
  );
}
