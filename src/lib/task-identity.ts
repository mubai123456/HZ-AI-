type TaskIdentityLike = {
  taskNo: string;
  providerTaskId?: string | null;
};

export function getDisplayTaskId(task: TaskIdentityLike): string {
  const providerTaskId = task.providerTaskId?.trim();
  if (providerTaskId) {
    return providerTaskId;
  }

  return task.taskNo;
}
