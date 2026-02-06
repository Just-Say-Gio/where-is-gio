import { getCachedSegments } from "@/lib/cache";
import { getOverridesMap } from "@/lib/hosting";
import { WhenCalendar } from "@/components/when-calendar";

export const dynamic = "force-dynamic";

const YEAR = 2026;

export default function WhenPage() {
  const segments = getCachedSegments() ?? [];
  const overrides = getOverridesMap();

  // Find all Thailand date ranges from segments
  const thailandDates = new Set<string>();
  for (const seg of segments) {
    if (seg.countryCode !== "TH") continue;
    const start = new Date(seg.startDate + "T00:00:00");
    const end = new Date(seg.endDate + "T00:00:00");
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      thailandDates.add(ds);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center space-y-3 mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold">When can I host? 🏠</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Gio is based in Hua Hin, Thailand. Green dates mean he&apos;s home and available to host.
            Crossed out dates mean he&apos;s already hosting or unavailable.
          </p>
        </div>

        {thailandDates.size === 0 ? (
          <div className="text-center p-8 border rounded-xl bg-card">
            <p className="text-2xl mb-2">📡</p>
            <p className="text-sm text-muted-foreground">
              No travel data loaded yet. Check back soon!
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-6 mb-8 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-sm bg-emerald-500/20 border border-emerald-500/40" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-sm bg-red-500/20 border border-red-500/40 flex items-center justify-center text-[8px] text-red-500">✕</div>
                <span>Unavailable</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-sm bg-muted border" />
                <span>Not in Thailand</span>
              </div>
            </div>

            <WhenCalendar
              year={YEAR}
              thailandDates={Array.from(thailandDates)}
              overrides={Object.keys(overrides)}
            />
          </>
        )}

        <div className="mt-12 text-center">
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            ← Back to travel calendar
          </a>
        </div>
      </div>
    </main>
  );
}
