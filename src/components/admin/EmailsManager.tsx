"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import {
  CheckCheck,
  Copy,
  Inbox,
  Mail,
  MailCheck,
  RefreshCw,
  Send,
  Trash2,
  Webhook,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdminEmailMessage {
  id: string;
  direction: string;
  status: string;
  fromName: string | null;
  fromEmail: string;
  toEmail: string;
  subject: string;
  textContent: string | null;
  htmlContent: string | null;
  provider: string | null;
  providerId: string | null;
  error: string | null;
  read: boolean;
  createdAt: Date | string;
}

export interface AdminEmailConfig {
  canSend: boolean;
  fromAddress: string;
  inboundWebhookUrl: string;
  webhookSecretConfigured: boolean;
}

interface EmailsManagerProps {
  messages: AdminEmailMessage[];
  config: AdminEmailConfig;
}

type TabKey = "inbox" | "sent" | "all";

const tabs: Array<{ key: TabKey; label: string; description: string }> = [
  { key: "inbox", label: "Entrada", description: "Emails recebidos pelo webhook" },
  { key: "sent", label: "Enviados", description: "Historico de envios do painel" },
  { key: "all", label: "Todos", description: "Visao completa da caixa" },
];

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-[#070d18] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10";
const labelClass = "mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-500";

export function EmailsManager({ messages, config }: EmailsManagerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("inbox");
  const [selectedId, setSelectedId] = useState(messages[0]?.id ?? "");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const counts = useMemo(() => {
    return {
      inbox: messages.filter((message) => message.direction === "inbound").length,
      sent: messages.filter((message) => message.direction === "outbound").length,
      all: messages.length,
      unread: messages.filter((message) => message.direction === "inbound" && !message.read).length,
    };
  }, [messages]);

  const filteredMessages = useMemo(() => {
    if (activeTab === "inbox") return messages.filter((message) => message.direction === "inbound");
    if (activeTab === "sent") return messages.filter((message) => message.direction === "outbound");
    return messages;
  }, [activeTab, messages]);

  const selectedMessage =
    messages.find((message) => message.id === selectedId) || filteredMessages[0] || messages[0] || null;

  async function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!config.canSend) {
      setFeedback({ type: "error", text: "Configure RESEND_API_KEY na Vercel para habilitar o envio." });
      return;
    }

    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body, replyTo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Nao foi possivel enviar o email.");

      setTo("");
      setSubject("");
      setBody("");
      setReplyTo("");
      setFeedback({ type: "success", text: "Email enviado e registrado no historico." });
      router.refresh();
    } catch (error) {
      setFeedback({ type: "error", text: error instanceof Error ? error.message : "Erro ao enviar email." });
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  async function markRead(id: string, read: boolean) {
    await fetch(`/api/admin/emails/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read }),
    });
    router.refresh();
  }

  async function deleteMessage(id: string) {
    if (!confirm("Remover este email do painel?")) return;
    await fetch(`/api/admin/emails/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function copyWebhook() {
    await navigator.clipboard.writeText(config.inboundWebhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-6 text-slate-100">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard icon={<Inbox className="h-5 w-5" />} label="Entrada" value={counts.inbox} detail={`${counts.unread} nao lidos`} />
          <MetricCard icon={<MailCheck className="h-5 w-5" />} label="Enviados" value={counts.sent} detail="Historico do painel" />
          <MetricCard icon={<Mail className="h-5 w-5" />} label="Total" value={counts.all} detail="Mensagens registradas" />
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#0b1220] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.25)]">
          <div className="flex items-start gap-3">
            <span className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-2 text-cyan-100">
              <Webhook className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Recebimento</p>
              <h3 className="mt-1 text-lg font-semibold text-white">Webhook de entrada</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Configure este endpoint no provedor de email para alimentar a caixa de entrada do admin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={copyWebhook}
            className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-xs text-slate-300 transition hover:bg-white/[0.07]"
          >
            <span className="truncate">{config.inboundWebhookUrl}</span>
            <Copy className="h-4 w-4 shrink-0" />
          </button>
          <p className="mt-3 text-xs text-slate-500">
            {config.webhookSecretConfigured
              ? "Header esperado: x-email-webhook-secret."
              : "Recomendado configurar EMAIL_WEBHOOK_SECRET para proteger o recebimento."}
          </p>
          {copied && <p className="mt-2 text-xs font-semibold text-emerald-300">Webhook copiado.</p>}
        </div>
      </section>

      <section className="grid gap-6 2xl:grid-cols-[430px_minmax(0,1fr)]">
        <div className="rounded-[30px] border border-white/10 bg-[#0b1220] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              const count = counts[tab.key];

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "rounded-2xl px-4 py-3 text-left transition",
                    active ? "bg-cyan-200 text-slate-950" : "border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                  )}
                >
                  <span className="block text-sm font-semibold">{tab.label} ({count})</span>
                  <span className={cn("mt-1 block text-[11px]", active ? "text-slate-700" : "text-slate-500")}>{tab.description}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 max-h-[720px] space-y-3 overflow-y-auto pr-1">
            {filteredMessages.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
                Nenhum email nesta visualizacao ainda.
              </div>
            ) : (
              filteredMessages.map((message) => {
                const active = selectedMessage?.id === message.id;
                const failed = message.status === "failed";

                return (
                  <button
                    key={message.id}
                    type="button"
                    onClick={() => setSelectedId(message.id)}
                    className={cn(
                      "w-full rounded-[24px] border p-4 text-left transition",
                      active
                        ? "border-cyan-300/40 bg-cyan-300/10 shadow-[0_18px_40px_rgba(103,232,249,0.08)]"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full", message.read || message.direction === "outbound" ? "bg-slate-600" : "bg-cyan-300")} />
                          <p className="truncate text-sm font-semibold text-white">{message.subject}</p>
                        </div>
                        <p className="mt-2 truncate text-xs text-slate-400">
                          {message.direction === "inbound" ? message.fromEmail : message.toEmail}
                        </p>
                      </div>
                      <StatusBadge status={message.status} />
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{messagePreview(message)}</p>
                    <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-600">
                      {formatDate(message.createdAt)} {failed ? " / falhou" : ""}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-6">
          <form onSubmit={handleSend} className="rounded-[30px] border border-white/10 bg-[#0b1220] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-200/80">Compositor</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Enviar email</h2>
                <p className="mt-2 text-sm text-slate-400">Envio via Resend usando o remetente configurado no ambiente.</p>
              </div>
              <div className={cn("rounded-2xl border px-4 py-3 text-sm", config.canSend ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100" : "border-amber-300/20 bg-amber-300/10 text-amber-100")}>
                {config.canSend ? "Envio ativo" : "RESEND_API_KEY pendente"}
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <div>
                <label className={labelClass}>Destinatario(s)</label>
                <input value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} placeholder="cliente@email.com, outro@email.com" required />
              </div>
              <div>
                <label className={labelClass}>Responder para (opcional)</label>
                <input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} className={inputClass} placeholder="contato@fozemdestaque.com.br" />
              </div>
            </div>
            <div className="mt-4">
              <label className={labelClass}>Assunto</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} placeholder="Assunto do email" required />
            </div>
            <div className="mt-4">
              <label className={labelClass}>Mensagem</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} className={cn(inputClass, "min-h-[190px] resize-y leading-7")} placeholder="Escreva a mensagem aqui..." required />
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">Remetente: {config.fromAddress}</p>
              <button type="submit" disabled={sending || !config.canSend} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-200 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">
                {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar email
              </button>
            </div>
            {feedback && (
              <div className={cn("mt-4 rounded-2xl border px-4 py-3 text-sm", feedback.type === "success" ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100" : "border-rose-300/20 bg-rose-300/10 text-rose-100")}>
                {feedback.text}
              </div>
            )}
          </form>

          <EmailDetail message={selectedMessage} onDelete={deleteMessage} onMarkRead={markRead} />
        </div>
      </section>
    </div>
  );
}

function EmailDetail({
  message,
  onDelete,
  onMarkRead,
}: {
  message: AdminEmailMessage | null;
  onDelete: (id: string) => void;
  onMarkRead: (id: string, read: boolean) => void;
}) {
  if (!message) {
    return (
      <div className="rounded-[30px] border border-white/10 bg-[#0b1220] p-10 text-center text-sm text-slate-500">
        Selecione uma mensagem para ver os detalhes.
      </div>
    );
  }

  return (
    <article className="rounded-[30px] border border-white/10 bg-[#0b1220] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={message.status} />
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-400">
              {message.direction === "inbound" ? "Recebido" : "Enviado"}
            </span>
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">{message.subject}</h2>
          <p className="mt-2 text-sm text-slate-500">{formatDate(message.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {message.direction === "inbound" && (
            <button type="button" onClick={() => onMarkRead(message.id, !message.read)} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/[0.06]">
              <CheckCheck className="h-4 w-4" />
              {message.read ? "Marcar nao lido" : "Marcar lido"}
            </button>
          )}
          <button type="button" onClick={() => onDelete(message.id)} className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/20 px-4 py-2.5 text-sm font-semibold text-rose-100 hover:bg-rose-500/10">
            <Trash2 className="h-4 w-4" />
            Remover
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 rounded-[24px] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300 md:grid-cols-2">
        <p><span className="text-slate-500">De:</span> {message.fromName ? `${message.fromName} <${message.fromEmail}>` : message.fromEmail}</p>
        <p><span className="text-slate-500">Para:</span> {message.toEmail}</p>
        {message.providerId && <p><span className="text-slate-500">ID provedor:</span> {message.providerId}</p>}
        {message.provider && <p><span className="text-slate-500">Origem:</span> {message.provider}</p>}
      </div>

      {message.error && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-300/20 bg-rose-500/10 p-4 text-sm text-rose-100">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {message.error}
        </div>
      )}

      <div className="mt-6 whitespace-pre-wrap rounded-[24px] border border-white/10 bg-[#070d18] p-5 text-sm leading-7 text-slate-200">
        {messagePreview(message)}
      </div>
    </article>
  );
}

function MetricCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail: string }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[#0b1220] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-2 text-cyan-100">{icon}</span>
        <span className="text-3xl font-semibold text-white">{value}</span>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-slate-400">{detail}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    sent: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
    received: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    failed: "border-rose-300/20 bg-rose-300/10 text-rose-100",
  } as Record<string, string>;

  const label = status === "sent" ? "Enviado" : status === "failed" ? "Falhou" : "Recebido";

  return (
    <span className={cn("rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]", styles[status] ?? styles.received)}>
      {label}
    </span>
  );
}

function messagePreview(message: AdminEmailMessage) {
  return message.textContent || stripHtml(message.htmlContent || "") || "Sem conteudo.";
}

function stripHtml(value: string) {
  return value.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function formatDate(date: Date | string) {
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
}
