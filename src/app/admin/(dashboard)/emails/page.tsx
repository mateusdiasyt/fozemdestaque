import { desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { EmailsManager } from "@/components/admin/EmailsManager";
import { auth, hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailMessages } from "@/lib/db/schema";
import { getConfiguredFromAddress, hasEmailProvider } from "@/lib/email";
import { ensureEmailMailboxes, getDefaultMailbox } from "@/lib/email-mailboxes";

export default async function AdminEmailsPage() {
  const session = await auth();
  const role = (session?.user?.role as "administrador" | "editor" | "colaborador") ?? "colaborador";

  if (!session?.user || !hasPermission(role, "emails")) {
    notFound();
  }

  const mailboxes = await ensureEmailMailboxes();
  const messages = await db
    .select()
    .from(emailMessages)
    .orderBy(desc(emailMessages.createdAt));
  const defaultMailbox = getDefaultMailbox(mailboxes);

  return (
    <div className="space-y-6 pb-10 text-slate-100">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(103,232,249,0.18),_transparent_30%),linear-gradient(180deg,#0b1020_0%,#060b16_100%)] px-6 py-6 shadow-[0_26px_90px_rgba(2,6,23,0.38)] md:px-8 md:py-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Admin / Comunicacao</p>
        <div className="mt-4 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <h1 className="font-headline text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Central de emails
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-400 md:text-base">
              Envie mensagens pelo painel, acompanhe o historico e receba emails do provedor via webhook em uma caixa interna.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Caixa padrao</p>
            <p className="mt-2 max-w-[340px] truncate text-sm font-semibold text-white">{defaultMailbox?.email || getConfiguredFromAddress()}</p>
          </div>
        </div>
      </section>

      <EmailsManager
        messages={messages}
        mailboxes={mailboxes}
        config={{
          canSend: hasEmailProvider(),
          fromAddress: getConfiguredFromAddress(),
          inboundWebhookUrl: getInboundWebhookUrl(),
          webhookSecretConfigured: Boolean(process.env.EMAIL_WEBHOOK_SECRET),
          siteUrl: getBaseUrl(),
        }}
      />
    </div>
  );
}

function getInboundWebhookUrl() {
  const baseUrl = getBaseUrl();

  return baseUrl ? `${baseUrl.replace(/\/$/, "")}/api/emails/inbound` : "/api/emails/inbound";
}

function getBaseUrl() {
  const explicitUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return explicitUrl || (vercelUrl ? `https://${vercelUrl}` : "");
}
