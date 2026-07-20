"use client";

type SlotData = {
  label: string;
  note: string | null;
  recipe: { id: string; title: string } | null;
  scale: number;
};

export default function SlotCell({
  slot,
  onOpen,
  onRemove,
}: {
  slot: SlotData;
  onOpen: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="relative">
      <button type="button" onClick={onOpen} className="w-full rounded-lg p-2 text-left text-sm">
        <span className="block text-[10px] uppercase text-ink/50">{slot.label}</span>
        {slot.recipe ? (
          <span className="mt-1 flex items-center gap-1.5 rounded-md bg-sky px-2 py-1">
            {slot.recipe.title}
            {slot.scale !== 1 && (
              <span className="rounded-full bg-olive px-1.5 py-0.5 text-[10px] font-bold text-white">
                {slot.scale}x
              </span>
            )}
          </span>
        ) : slot.note ? (
          <span className="mt-1 block rounded-md bg-card px-2 py-1">{slot.note}</span>
        ) : (
          <span className="mt-1 block rounded-md border-2 border-dashed border-buttercream px-2 py-1 text-ink/40">+ add</span>
        )}
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${slot.label} slot`}
          className="absolute right-1 top-1 rounded-full px-1.5 text-xs leading-4 text-ink/40 hover:text-canyon"
        >
          ×
        </button>
      )}
    </div>
  );
}
