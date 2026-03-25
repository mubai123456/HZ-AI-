"use client";

interface Category {
  id: string;
  name: string;
}

interface CategoryNavProps {
  categories: Category[];
  activeCategoryId: string | null;
  onSelect: (id: string | null) => void;
}

export function CategoryNav({ categories, activeCategoryId, onSelect }: CategoryNavProps) {
  return (
    <div className="flex items-center gap-7 overflow-x-auto scrollbar-hide py-1">
      <button
        onClick={() => onSelect(null)}
        className={`relative whitespace-nowrap text-[15px] transition-all ${
          !activeCategoryId
            ? "font-bold text-slate-900 after:absolute after:-bottom-1 after:left-1/2 after:h-[3px] after:w-5 after:-translate-x-1/2 after:rounded-full after:bg-slate-900"
            : "font-medium text-slate-500 hover:text-slate-800"
        }`}
      >
        全部
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={`relative whitespace-nowrap text-[15px] transition-all ${
            activeCategoryId === c.id
              ? "font-bold text-slate-900 after:absolute after:-bottom-1 after:left-1/2 after:h-[3px] after:w-5 after:-translate-x-1/2 after:rounded-full after:bg-slate-900"
              : "font-medium text-slate-500 hover:text-slate-800"
          }`}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}
