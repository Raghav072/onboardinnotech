export interface FilterField {
  label: string;
  kind: 'search' | 'select';
  placeholder: string;
}

/**
 * Renders the filter controls in a disabled fieldset. The layout is final;
 * the behaviour is added when the data layer exists. Disabled controls are
 * honest: nothing here pretends to filter.
 */
export function FilterBar({ fields, activeIn }: { fields: FilterField[]; activeIn: string }) {
  return (
    <div className="mb-6">
      <fieldset disabled className="grid gap-3 rounded-card border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="sr-only">Filters (not active yet)</legend>
        {fields.map((f) => (
          <label key={f.label} className="flex flex-col gap-1 text-sm font-medium">
            {f.label}
            {f.kind === 'search' ? (
              <input type="search" placeholder={f.placeholder} className="min-h-11 rounded-tile border border-line bg-canvas px-3 text-sm disabled:cursor-not-allowed disabled:opacity-70" />
            ) : (
              <select className="min-h-11 rounded-tile border border-line bg-canvas px-3 text-sm disabled:cursor-not-allowed disabled:opacity-70" defaultValue="">
                <option value="">{f.placeholder}</option>
              </select>
            )}
          </label>
        ))}
      </fieldset>
      <p className="mt-2 text-xs text-muted">Filters switch on in {activeIn}.</p>
    </div>
  );
}
