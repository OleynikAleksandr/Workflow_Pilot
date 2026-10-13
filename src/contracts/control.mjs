// Stable ownership key. Visible selection is deliberately not part of session identity.
export const sessionRuntimeKey = project => project ? JSON.stringify([
  project.workspace, project.sessionId, project.assignmentId ?? null, project.taskId ?? null,
]) : 'entry';
