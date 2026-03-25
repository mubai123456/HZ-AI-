import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  categoryFindManyMock,
  appGroupByMock,
  categoryFindUniqueMock,
  categoryFindFirstMock,
  categoryUpdateMock,
  categoryDeleteMock,
  appUpdateManyMock,
  transactionMock,
} = vi.hoisted(() => ({
  categoryFindManyMock: vi.fn(),
  appGroupByMock: vi.fn(),
  categoryFindUniqueMock: vi.fn(),
  categoryFindFirstMock: vi.fn(),
  categoryUpdateMock: vi.fn(),
  categoryDeleteMock: vi.fn(),
  appUpdateManyMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appCategory: {
      findMany: categoryFindManyMock,
      findUnique: categoryFindUniqueMock,
      findFirst: categoryFindFirstMock,
      update: categoryUpdateMock,
      delete: categoryDeleteMock,
    },
    app: {
      groupBy: appGroupByMock,
    },
    $transaction: transactionMock,
  },
}));

import { deleteCategory, getAllCategories, updateCategory } from "@/lib/db/categories";

describe("category helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        appCategory: {
          update: categoryUpdateMock,
          delete: categoryDeleteMock,
        },
        app: {
          updateMany: appUpdateManyMock,
        },
      }),
    );
  });

  it("returns app counts for each category", async () => {
    categoryFindManyMock.mockResolvedValue([
      { id: "cat-1", name: "Images", sortOrder: 1, enabled: true },
      { id: "cat-2", name: "Video", sortOrder: 2, enabled: false },
    ]);
    appGroupByMock.mockResolvedValue([
      { category: "Images", _count: { category: 3 } },
      { category: "Video", _count: { category: 1 } },
    ]);

    const result = await getAllCategories();

    expect(categoryFindManyMock).toHaveBeenCalledWith({
      orderBy: { sortOrder: "asc" },
    });
    expect(appGroupByMock).toHaveBeenCalledWith({
      by: ["category"],
      where: {
        category: {
          not: null,
        },
      },
      _count: {
        category: true,
      },
    });
    expect(result).toEqual([
      { id: "cat-1", name: "Images", sortOrder: 1, enabled: true, appCount: 3 },
      { id: "cat-2", name: "Video", sortOrder: 2, enabled: false, appCount: 1 },
    ]);
  });

  it("renames linked app categories inside the update transaction", async () => {
    categoryFindUniqueMock.mockResolvedValue({
      id: "cat-1",
      name: "Images",
      sortOrder: 1,
      enabled: true,
    });
    categoryFindFirstMock.mockResolvedValue(null);
    categoryUpdateMock.mockResolvedValue({
      id: "cat-1",
      name: "Illustration",
      sortOrder: 1,
      enabled: true,
    });

    const result = await updateCategory("cat-1", { name: "Illustration" });

    expect(appUpdateManyMock).toHaveBeenCalledWith({
      where: { category: "Images" },
      data: { category: "Illustration" },
    });
    expect(result).toEqual({
      id: "cat-1",
      name: "Illustration",
      sortOrder: 1,
      enabled: true,
      appCount: 0,
    });
  });

  it("clears linked app categories before deleting the category", async () => {
    categoryFindUniqueMock.mockResolvedValue({
      id: "cat-1",
      name: "Images",
      sortOrder: 1,
      enabled: true,
    });
    categoryDeleteMock.mockResolvedValue({ id: "cat-1" });

    await deleteCategory("cat-1");

    expect(appUpdateManyMock).toHaveBeenCalledWith({
      where: { category: "Images" },
      data: { category: null },
    });
    expect(categoryDeleteMock).toHaveBeenCalledWith({
      where: { id: "cat-1" },
    });
  });
});
