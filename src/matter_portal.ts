import { z } from "zod";
import { decideFollowUp } from "./deadline_policy.ts";
import { InfraiError, InfraiMail } from "./infrai_mail.ts";

const intakeSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  name: z.string().min(1),
  matterTitle: z.string().min(1),
  signedDocumentName: z.string().min(1),
  deadline: z.string().date(),
});

export type MatterIntake = z.infer<typeof intakeSchema>;

export async function openMatterPortal(input: MatterIntake, now = new Date()) {
  const intake = intakeSchema.parse(input);
  const infrai = new InfraiMail();
  const idempotencyKey = `matter-${intake.email}-${intake.deadline}`;
  try {
    const created = await infrai.post("/v1/auth/user/create", {
      email: intake.email,
      password: intake.password,
      name: intake.name,
      metadata: { matter_title: intake.matterTitle },
      mode: "signup",
      idempotency_key: idempotencyKey,
    }, true) as { user_id: string };
    const session = await infrai.post("/v1/auth/session/create", {
      user_id: created.user_id,
      method: "password",
    });
    const followUp = decideFollowUp(intake.deadline, now);
    const message = await infrai.post("/v1/email/send", {
      to: intake.email,
      subject: `Signed document for ${intake.matterTitle}`,
      html: `<p>${intake.signedDocumentName} is ready for review.</p><p>Deadline: ${intake.deadline}</p>`,
    }) as { message_id: string };
    return { session, messageId: message.message_id, followUp };
  } catch (error) {
    if (error instanceof InfraiError) {
      return { status: error.status, code: error.code };
    }
    throw error;
  }
}
