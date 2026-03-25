"use client";

import type { FeishuColumnMappingEntry } from "@/lib/feishu-sync-mapping";
import { isFeishuSyncSourceKey, type FeishuSyncFieldOption } from "@/lib/feishu-sync-fields";

type Props = {
  entries: FeishuColumnMappingEntry[];
  options: FeishuSyncFieldOption[];
  onChange: (entries: FeishuColumnMappingEntry[]) => void;
  emptyState: string;
  addLabel?: string;
  testIdPrefix?: string;
};

function uniqueOptionValues(options: FeishuSyncFieldOption[]) {
  return Array.from(new Set(options.map((option) => option.value)));
}

export function FeishuSyncMappingEditor({
  entries,
  options,
  onChange,
  emptyState,
  addLabel = "添加映射",
  testIdPrefix,
}: Props) {
  const optionValues = uniqueOptionValues(options);
  const selectedValues = new Set(entries.map((entry) => entry.taskField));
  const addableValue = optionValues.find((value) => !selectedValues.has(value));

  const updateEntry = (index: number, patch: Partial<FeishuColumnMappingEntry>) => {
    onChange(entries.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry)));
  };

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, entryIndex) => entryIndex !== index));
  };

  const addEntry = () => {
    if (!addableValue) {
      return;
    }

    onChange([...entries, { taskField: addableValue, feishuColumn: "" }]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="text-sm text-slate-500">{emptyState}</div>
        <button
          type="button"
          onClick={addEntry}
          disabled={!addableValue}
          data-testid={testIdPrefix ? `${testIdPrefix}-add` : undefined}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {addLabel}
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          暂无字段映射。
        </div>
      ) : null}

      {entries.map((entry, index) => {
        const selectedByOthers = new Set(
          entries
            .filter((_, entryIndex) => entryIndex !== index)
            .map((item) => item.taskField),
        );
        const entryOptions = options.some((option) => option.value === entry.taskField)
          ? options
          : [
              ...options,
              {
                value: entry.taskField,
                label: entry.taskField,
                group: entry.taskField.startsWith("params.") ? "params" : "shared",
              } satisfies FeishuSyncFieldOption,
            ];

        return (
          <div
            key={`${entry.taskField}-${index}`}
            className="grid gap-3 rounded-[18px] border border-slate-200 bg-slate-50 p-4 md:grid-cols-[240px_minmax(0,1fr)_auto]"
          >
            <select
              value={entry.taskField}
              onChange={(event) => {
                const { value } = event.target;
                if (!isFeishuSyncSourceKey(value)) {
                  return;
                }

                updateEntry(index, { taskField: value });
              }}
              data-testid={testIdPrefix ? `${testIdPrefix}-field-${index}` : undefined}
              className="rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500"
            >
              {entryOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.value !== entry.taskField && selectedByOthers.has(option.value)}
                >
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={entry.feishuColumn}
              onChange={(event) => updateEntry(index, { feishuColumn: event.target.value })}
              placeholder="飞书列名"
              data-testid={testIdPrefix ? `${testIdPrefix}-column-${index}` : undefined}
              className="rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500"
            />
            <button
              type="button"
              onClick={() => removeEntry(index)}
              data-testid={testIdPrefix ? `${testIdPrefix}-remove-${index}` : undefined}
              className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
            >
              删除
            </button>
          </div>
        );
      })}
    </div>
  );
}
