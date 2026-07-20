"use client";
import { useState, useTransition } from "react";
import type { Tag, TagGroup } from "@prisma/client";
import { TAG_GROUP_LABELS } from "@/lib/recipes/tags";
import { createTag, detectEquipmentTags } from "@/lib/recipes/actions";

export default function TagPicker({ tags, initialIds }: { tags: Tag[]; initialIds?: string[] }) {
  const [allTags, setAllTags] = useState<Tag[]>(tags);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialIds ?? []));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const groups = Array.from(new Set(allTags.map((t) => t.group))) as TagGroup[];

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  }

  function addTag(group: TagGroup) {
    const name = (drafts[group] ?? "").trim();
    if (!name) return;
    startTransition(async () => {
      const tag = await createTag(group, name);
      setAllTags((prev) => (prev.some((t) => t.id === tag.id) ? prev : [...prev, tag]));
      setSelected((prev) => new Set(prev).add(tag.id));
      setDrafts((prev) => ({ ...prev, [group]: "" }));
    });
  }

  function detectEquipment() {
    const el = document.getElementById("instructions") as HTMLTextAreaElement | null;
    const text = el?.value ?? "";
    if (!text) return;
    startTransition(async () => {
      const detected = await detectEquipmentTags(text);
      setAllTags((prev) => {
        const next = [...prev];
        for (const tag of detected) {
          if (!next.some((t) => t.id === tag.id)) next.push(tag);
        }
        return next;
      });
      setSelected((prev) => {
        const next = new Set(prev);
        for (const tag of detected) next.add(tag.id);
        return next;
      });
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="tagId" value={id} />
      ))}
      <button
        type="button"
        onClick={detectEquipment}
        disabled={isPending}
        className="self-start rounded-full border-2 border-sky px-3 py-1 text-sm disabled:opacity-50"
      >
        Detect equipment from instructions
      </button>
      {groups.map((g) => (
        <div key={g}>
          <p className="text-sm font-bold">{TAG_GROUP_LABELS[g]}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {allTags.filter((t) => t.group === g).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggle(t.id)}
                className={`rounded-full px-3 py-1 ${selected.has(t.id) ? "bg-canyon text-white" : "border-2 border-buttercream"}`}
              >
                {t.name}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <label className="sr-only" htmlFor={`add-tag-${g}`}>
              {`Add ${TAG_GROUP_LABELS[g].toLowerCase()} tag`}
            </label>
            <input
              id={`add-tag-${g}`}
              value={drafts[g] ?? ""}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [g]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(g);
                }
              }}
              placeholder={`New ${TAG_GROUP_LABELS[g].toLowerCase()} tag`}
              className="rounded-lg border-2 border-buttercream p-1 text-sm"
            />
            <button
              type="button"
              onClick={() => addTag(g)}
              disabled={isPending}
              className="rounded-full border-2 border-sky px-2 py-1 text-sm disabled:opacity-50"
            >
              + Add
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
