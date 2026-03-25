"use client";

import { useState, useCallback } from "react";

const CATEGORIES = ["全部", "图像", "视频", "声音", "文本"] as const;

const SORT_OPTIONS = [
  { value: "recommended", label: "推荐" },
  { value: "latest", label: "最新" },
  { value: "popular", label: "最热" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

interface AppFilterBarProps {
  onSearch: (query: string) => void;
  onFilter: (category: string) => void;
  onSort?: (sort: SortValue) => void;
}

export function AppFilterBar({ onSearch, onFilter, onSort }: AppFilterBarProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("全部");
  const [activeSort, setActiveSort] = useState<SortValue>("recommended");

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);
      onSearch(val);
    },
    [onSearch]
  );

  const handleCategory = useCallback(
    (cat: string) => {
      setActiveCategory(cat);
      onFilter(cat);
    },
    [onFilter]
  );

  const handleSort = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value as SortValue;
      setActiveSort(val);
      onSort?.(val);
    },
    [onSort]
  );

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Search input */}
      <div className="relative flex-1 max-w-sm">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--label-quaternary)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="搜索应用名称..."
          value={query}
          onChange={handleSearch}
          className="input w-full pl-10"
          aria-label="搜索应用名称"
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="应用分类">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            role="tab"
            aria-selected={activeCategory === cat}
            onClick={() => handleCategory(cat)}
            className={`btn-press shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              activeCategory === cat
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--bg-secondary)] text-[var(--label-tertiary)] hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--gray-4)]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Sort dropdown */}
      <div className="relative">
        <select
          value={activeSort}
          onChange={handleSort}
          className="input appearance-none pr-8 text-sm cursor-pointer"
          aria-label="排序方式"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--label-tertiary)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
