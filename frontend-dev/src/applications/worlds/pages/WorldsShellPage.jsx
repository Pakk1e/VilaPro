import WorldCanvas from "../components/WorldCanvas";

export default function WorldsShellPage() {
  return (
    <div className="h-screen w-full overflow-hidden bg-[#f6f6f4] p-4">
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-[#dedfdf] bg-white">
        <div className="flex shrink-0 items-center justify-between border-b border-[#dedfdf] px-4 py-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#69717b]">
              Model Canvas
            </div>

            <div className="mt-1 text-[10px] text-[#9aa0a7]">
              React Flow
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <WorldCanvas />
        </div>
      </section>
    </div>
  );
}