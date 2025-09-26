export type MailParams = {
  to: string;
  subject: string;
  text: string;
};

export async function sendMail({ to, subject, text }: MailParams): Promise<void> {
  // TODO: Integrar servicio real. Por ahora registramos en consola.
  console.info(`[Email simulado] A: ${to} | Asunto: ${subject} | Contenido: ${text}`);
}
