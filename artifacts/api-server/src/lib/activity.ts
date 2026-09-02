import { db, activitiesTable } from "@workspace/db";

export async function logActivity(
  projectId: number,
  eventType: string,
  description: string
): Promise<void> {
  await db.insert(activitiesTable).values({ projectId, eventType, description });
}
