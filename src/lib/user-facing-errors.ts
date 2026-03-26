type ErrorContext = "upload" | "submit" | "poll";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? "");
}

function getDefaultMessage(context: ErrorContext) {
  switch (context) {
    case "upload":
      return "图片上传失败，请稍后重试。";
    case "poll":
      return "暂时无法获取任务最新状态，请稍后再试。";
    case "submit":
    default:
      return "任务提交失败，请稍后重试。";
  }
}

export function isPermanentDispatchError(error: unknown) {
  const message = getErrorMessage(error);

  return [
    "Missing RunningHub API key",
    "No RunningHub channel configured",
    "RunningHub channel not found",
    "Task submit snapshot is missing nodeInfoList",
    "App not found",
    "App is not enabled",
    "当前应用未配置可用的算力通道",
  ].some((keyword) => message.includes(keyword));
}

export function sanitizeUserFacingError(error: unknown, context: ErrorContext) {
  const message = getErrorMessage(error);

  if (
    message.includes("Missing RunningHub API key") ||
    message.includes("No RunningHub channel configured") ||
    message.includes("RunningHub channel not found")
  ) {
    return "算力通道配置未完成，请联系管理员检查集成设置。";
  }

  if (message.includes("Task submit snapshot is missing nodeInfoList")) {
    return "当前应用的提交流程配置不完整，请联系管理员检查应用映射。";
  }

  if (message.includes("当前应用未配置可用的算力通道")) {
    return "当前应用未配置可用的算力通道，请联系管理员检查应用设置。";
  }

  if (message.includes("RunningHub API error")) {
    if (context === "upload") {
      return "图片上传到算力通道失败，请稍后重试。";
    }

    if (context === "poll") {
      return "暂时无法从算力通道获取最新状态，请稍后再试。";
    }

    return "任务提交到算力通道失败，请稍后重试。";
  }

  if (message.startsWith("Upload failed")) {
    return "图片上传到算力通道失败，请稍后重试。";
  }

  if (message.includes("Task has no providerTaskId yet")) {
    return "任务仍在本地队列中，尚未派发到算力通道。";
  }

  if (message.includes("Task not found")) {
    return "任务不存在或你已无权访问。";
  }

  if (message.includes("App not found") || message.includes("App is not enabled")) {
    return "当前应用暂不可用，请刷新后重试。";
  }

  return getDefaultMessage(context);
}
