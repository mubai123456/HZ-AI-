describe("environment schema", () => {
  it("uses safe local defaults when runtime values are absent", async () => {
    const { env } = await import("@/lib/env");

    expect(env.APP_NAME).toBe("AI Workbench");
    expect(env.APP_ENV).toBe("local");
    expect(env.TASK_MAX_CONCURRENCY).toBe(5);
    expect(env.RUNNINGHUB_WEBAPP_ID).toBe("2027211316242423809");
  });
});
