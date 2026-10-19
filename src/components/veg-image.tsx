import { cn } from "@/lib/utils";
import type { Enums } from "@/types/database";

const TINT: Record<Enums<"item_category">, string> = {
  daily: "bg-blush",
  vegetables: "bg-mint",
  roots: "bg-butter",
  leafy: "bg-mint",
  other: "bg-lilac",
};

/** Photo of a vegetable on a pastel tile; a calm leaf mark until a real photo exists. */
export function VegImage({
  photo,
  category,
  className,
  iconClassName,
}: {
  photo: string | null;
  category: Enums<"item_category">;
  className?: string;
  iconClassName?: string;
}) {
  const real = !!photo && /\.(webp|jpe?g|png|avif)$/i.test(photo);
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden", TINT[category], className)}>
      {real ? (
        // eslint-disable-next-line @next/next/no-img-element -- catalogue photos are small, pre-sized webp
        <img src={photo} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={cn("size-1/3 text-[#9aa8a2]", iconClassName)}
        >
          <path d="M6 20c6 0 12-5 12-14C9 6 4 11 6 20z" />
          <path d="M6 20c2-5 5-8 9-10" />
        </svg>
      )}
    </div>
  );
}
