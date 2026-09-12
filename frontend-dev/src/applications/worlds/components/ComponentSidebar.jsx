import ComponentPropertiesPanel from "./ComponentPropertiesPanel";
import { worldDefinitions } from "../model/worldDefinitions";
import { WORLD_EXAMPLES } from "../model/worldExamples";
import { getSimulationAnalysisLabel } from "../model/simulationConfig";

export default function ComponentSidebar({
  nodes,
  selectedNode,
  onAddComponent,
  onLoadExample,
  onSelectComponent,
  onChangeProperty,
}) {
  const selectedDefinition = selectedNode?.data?.definitionKey
    ? worldDefinitions[selectedNode.data.definitionKey]
    : null;

  return (
    <aside
      data-testid="component-palette"
      onClick={(event) => event.stopPropagation()}
      className="absolute right-4 top-4 z-10 flex max-h-[calc(100vh-32px)] w-[320px] flex-col overflow-hidden rounded-xl border border-[#d9dde2] bg-white shadow-md"
    >
      <div className="shrink-0 border-b border-[#e4e7eb] px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#58718f]">
          Components
        </div>
        <div className="mt-1 text-sm font-semibold text-[#17253a]">
          Palette
        </div>
      </div>

      <div data-testid="world-examples" className="shrink-0 border-b border-[#e4e7eb] p-2">
        <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">
          Examples
        </div>
        <div className="space-y-1">
          {WORLD_EXAMPLES.map((example) => (
            <button
              key={example.id}
              type="button"
              onClick={() => onLoadExample(example)}
              className="w-full rounded-lg border border-[#e4e7eb] bg-[#fafbfc] px-3 py-2 text-left transition hover:border-[#cfd5dc] hover:bg-white"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 truncate text-xs font-medium text-[#26364d]">
                  {example.label}
                </div>
                <div className="shrink-0 text-[9px] font-medium uppercase tracking-[0.08em] text-[#58718f]">
                  {getSimulationAnalysisLabel(example.simulationPreset.analysis)}
                </div>
              </div>
              <div className="mt-0.5 text-[9px] text-[#8a929c]">
                {example.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="shrink-0 border-b border-[#e4e7eb] p-2">
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(worldDefinitions).map(([key, definition]) => (
            <button
              key={key}
              type="button"
              onClick={() => onAddComponent(key)}
              className="rounded-lg border border-[#e4e7eb] bg-[#fafbfc] px-3 py-2.5 text-left transition hover:border-[#cfd5dc] hover:bg-white"
            >
              <div className="text-xs font-medium text-[#26364d]">
                {definition.type}
              </div>
              <div className="mt-0.5 text-[9px] text-[#8a929c]">
                Add to canvas
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-[#e4e7eb] px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">
              Canvas components
            </div>
            <div className="text-[10px] text-[#8a929c]">{nodes.length}</div>
          </div>

          {nodes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#d9dde2] px-3 py-3 text-center text-xs text-[#69717b]">
              Add a component to get started.
            </div>
          ) : (
            <div className="space-y-1">
              {nodes.map((node) => {
                const definition = node.data?.definitionKey
                  ? worldDefinitions[node.data.definitionKey]
                  : null;
                const propertyEntries = Object.entries(
                  definition?.properties ?? {}
                );

                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => onSelectComponent(node.id)}
                    className={[
                      "w-full rounded-md border px-3 py-2 text-left transition",
                      selectedNode?.id === node.id
                        ? "border-[#58718f] bg-[#f6f8fb]"
                        : "border-transparent hover:border-[#e4e7eb] hover:bg-[#fafbfc]",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 truncate text-xs font-medium text-[#17253a]">
                        {node.data?.label ?? node.id}
                      </div>
                      <div className="shrink-0 text-[9px] uppercase tracking-[0.08em] text-[#8a929c]">
                        {node.data?.componentType ?? "Component"}
                      </div>
                    </div>
                    {propertyEntries.length > 0 && (
                      <div className="mt-1 truncate text-[10px] text-[#69717b]">
                        {propertyEntries
                          .map(([key, property]) => {
                            const value =
                              node.data?.properties?.[key] ??
                              property.defaultValue ??
                              "";
                            return `${value}${property.unit ? ` ${property.unit}` : ""}`;
                          })
                          .join(" · ")}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedNode ? (
          <div data-testid="component-inspector">
            <div className="border-b border-[#e4e7eb] px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">
                Selected component
              </div>
              <div className="mt-1 text-base font-semibold text-[#17253a]">
                {selectedNode.data?.label ?? "Unnamed"}
              </div>
              <div className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-[#58718f]">
                {selectedNode.data?.componentType ?? "Component"}
              </div>
            </div>

            <ComponentPropertiesPanel
              definition={selectedDefinition}
              properties={selectedNode.data?.properties ?? {}}
              onChange={onChangeProperty}
            />
          </div>
        ) : (
          <div className="px-4 py-5 text-xs leading-5 text-[#8a929c]">
            Select a component on the canvas to view and edit its properties.
          </div>
        )}
      </div>
    </aside>
  );
}
