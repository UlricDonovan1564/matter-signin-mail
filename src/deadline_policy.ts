export type FollowUp = "send-now" | "hold";

export function decideFollowUp(deadline: string, now: Date): FollowUp {
  const due = new Date(`${deadline}T17:00:00.000Z`);
  const hoursUntilDue = (due.getTime() - now.getTime()) / 3_600_000;
  return hoursUntilDue <= 48 ? "send-now" : "hold";
}
