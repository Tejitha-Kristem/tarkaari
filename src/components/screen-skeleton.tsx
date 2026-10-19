/** Shown the instant a screen is tapped, while its data loads (Next.js loading.tsx). */
export function ScreenSkeleton({ header = "sub" }: { header?: "green" | "sub" }) {
  const bar = "animate-pulse rounded-full bg-[#e3e9e5]";
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-4">
      {header === "green" ? (
        <div className="flex flex-col gap-4 rounded-b-[1.875rem] bg-primary px-4 pt-5 pb-6">
          <div className="h-5 w-32 animate-pulse rounded-full bg-white/15" />
          <div className="h-8 w-48 animate-pulse rounded-full bg-white/15" />
          <div className="h-14 animate-pulse rounded-2xl bg-white/10" />
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 pt-4">
          <div className="size-11 animate-pulse rounded-full bg-card shadow-card" />
          <div className={`h-6 w-40 ${bar}`} />
        </div>
      )}
      <div className="flex flex-col gap-3 px-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-[1.375rem] bg-card p-4 shadow-card">
            <div className="size-12 shrink-0 animate-pulse rounded-2xl bg-[#e3e9e5]" />
            <div className="flex flex-1 flex-col gap-2">
              <div className={`h-4 w-3/5 ${bar}`} />
              <div className={`h-3 w-2/5 ${bar}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
