"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import {
  BadgeCheck,
  CheckCheck,
  Copy,
  Inbox,
  Mail,
  MailCheck,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  Trash2,
  Webhook,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdminEmailMessage {
  id: string;
  direction: string;
  status: string;
  mailboxEmail: string | null;
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

export interface AdminEmailMailbox {
  id: string;
  label: string;
  email: string;
  description: string | null;
  order: number;
  active: boolean;
  isDefault: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AdminEmailConfig {
  canSend: boolean;
  fromAddress: string;
  inboundWebhookUrl: string;
  webhookSecretConfigured: boolean;
  siteUrl?: string;
}

interface EmailsManagerProps {
  messages: AdminEmailMessage[];
  mailboxes: AdminEmailMailbox[];
  config: AdminEmailConfig;
}

type TabKey = "inbox" | "sent" | "all";

type MailboxDraft = {
  label: string;
  email: string;
  description: string;
  active: boolean;
  isDefault: boolean;
};

const tabs: Array<{ key: TabKey; label: string; description: string }> = [
  { key: "inbox", label: "Entrada", description: "Emails recebidos no sistema" },
  { key: "sent", label: "Enviados", description: "Historico de respostas e disparos" },
  { key: "all", label: "Todos", description: "Visao completa das caixas internas" },
];

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-[#070d18] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10";
const labelClass = "mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-500";
const panelClass = "rounded-[30px] border border-white/10 bg-[#0b1220] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] md:p-6";

export function EmailsManager({ messages, mailboxes, config }: EmailsManagerProps) {
  const router = useRouter();
  const activeMailboxes = useMemo(
    () => mailboxes.filter((mailbox) => mailbox.active).sort((a, b) => a.order - b.order),
    [mailboxes]
  );
  const defaultMailbox = activeMailboxes.find((mailbox) => mailbox.isDefault) ?? activeMailboxes[0] ?? null;

  const [activeTab, setActiveTab] = useState<TabKey>("inbox");
  const [mailboxFilter, setMailboxFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState(messages[0]?.id ?? "");
  const [composeMailbox, setComposeMailbox] = useState(defaultMailbox?.email ?? "");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [editingMailboxId, setEditingMailboxId] = useState<string | null>(null);
  const [mailboxDraft, setMailboxDraft] = useState<MailboxDraft>(() => createMailboxDraft(null));
  const [savingMailbox, setSavingMailbox] = useState(false);
  const [mailboxFeedback, setMailboxFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!composeMailbox || !activeMailboxes.some((mailbox) => mailbox.email === composeMailbox)) {
      setComposeMailbox(defaultMailbox?.email ?? "");
    }
  }, [activeMailboxes, composeMailbox, defaultMailbox]);

  const counts = useMemo(() => {
    return {
      inbox: messages.filter((message) => message.direction === "inbound").length,
      sent: messages.filter((message) => message.direction === "outbound").length,
      all: messages.length,
      unread: messages.filter((message) => message.direction === "inbound" && !message.read).length,
    };
  }, [messages]);

  const mailboxCounts = useMemo(() => {
    return mailboxes.reduce<Record<string, number>>((acc, mailbox) => {
      acc[mailbox.email] = messages.filter((message) => message.mailboxEmail === mailbox.email).length;
      return acc;
    }, {});
  }, [mailboxes, messages]);

  const filteredMessages = useMemo(() => {
    const byTab =
      activeTab === "inbox"
        ? messages.filter((message) => message.direction === "inbound")
        : activeTab === "sent"
          ? messages.filter((message) => message.direction === "outbound")
          : messages;

    if (mailboxFilter === "all") return byTab;
    return byTab.filter((message) => message.mailboxEmail === mailboxFilter);
  }, [activeTab, mailboxFilter, messages]);

  useEffect(() => {
    if (!filteredMessages.length) {
      setSelectedId("");
      return;
    }

    if (!filteredMessages.some((message) => message.id === selectedId)) {
      setSelectedId(filteredMessages[0]?.id ?? "");
    }
  }, [filteredMessages, selectedId]);

  const selectedMessage = filteredMessages.find((message) => message.id === selectedId) || filteredMessages[0] || null;

  async function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!config.canSend) {
      setFeedback({ type: "error", text: "Configure RESEND_API_KEY na Vercel para habilitar o envio." });
      return;
    }

    if (!composeMailbox) {
      setFeedback({ type: "error", text: "Cadastre e ative ao menos uma caixa em Configurar Emails." });
      return;
    }

    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body, replyTo, mailboxEmail: composeMailbox }),
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

  function resetMailboxForm(nextMailbox?: AdminEmailMailbox | null) {
    const target = typeof nextMailbox === "undefined" ? defaultMailbox : nextMailbox;
    setEditingMailboxId(target?.id ?? null);
    setMailboxDraft(createMailboxDraft(target));
    setMailboxFeedback(null);
  }

  async function handleMailboxSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingMailbox(true);
    setMailboxFeedback(null);

    try {
      const payload = {
        label: mailboxDraft.label,
        email: mailboxDraft.email,
        description: mailboxDraft.description,
        active: mailboxDraft.active,
        isDefault: mailboxDraft.isDefault,
      };
      const res = await fetch(
        editingMailboxId ? `/api/admin/email-mailboxes/${editingMailboxId}` : "/api/admin/email-mailboxes",
        {
          method: editingMailboxId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Nao foi possivel salvar a caixa.");

      setMailboxFeedback({
        type: "success",
        text: editingMailboxId ? "Caixa atualizada com sucesso." : "Caixa criada com sucesso.",
      });
      router.refresh();
    } catch (error) {
      setMailboxFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao salvar a caixa.",
      });
    } finally {
      setSavingMailbox(false);
    }
  }

  async function handleDeleteMailbox(id: string) {
    if (!confirm("Remover esta caixa do painel?")) return;

    const res = await fetch(`/api/admin/email-mailboxes/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMailboxFeedback({ type: "error", text: data?.error || "Nao foi possivel remover a caixa." });
      return;
    }

    if (editingMailboxId === id) {
      resetMailboxForm(defaultMailbox);
    }
    router.refresh();
  }

  return (
    <div className="space-y-6 text-slate-100">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <div className={panelClass}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-200/80">Configurar Emails</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Caixas internas do portal</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Cadastre os enderecos que vao existir dentro do admin. O sistema envia usando a caixa escolhida e distribui as mensagens recebidas pela caixa correta.
              </p>
            </div>
            <button
              type="button"
              onClick={() => resetMailboxForm(null)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
            >
              <Plus className="h-4 w-4" />
              Nova caixa
            </button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {mailboxes.map((mailbox) => {
              const isEditing = editingMailboxId === mailbox.id;
              const isSelectedFilter = mailboxFilter === mailbox.email;
              return (
                <article
                  key={mailbox.id}
                  className={cn(
                    "rounded-[26px] border p-4 transition",
                    isEditing || isSelectedFilter
                      ? "border-cyan-300/35 bg-cyan-300/10 shadow-[0_18px_38px_rgba(103,232,249,0.08)]"
                      : "border-white/10 bg-white/[0.03]"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{mailbox.label}</p>
                      <p className="mt-1 text-xs text-slate-400">{mailbox.email}</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                        mailbox.active
                          ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                          : "border-white/10 bg-white/[0.04] text-slate-400"
                      )}
                    >
                      {mailbox.active ? "Ativa" : "Pausada"}
                    </span>
                  </div>
                  {mailbox.description && <p className="mt-3 text-sm leading-6 text-slate-400">{mailbox.description}</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {mailbox.isDefault && (
                      <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                        Padrao
                      </span>
                    )}
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {mailboxCounts[mailbox.email] ?? 0} mensagens
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setMailboxFilter((current) => (current === mailbox.email ? "all" : mailbox.email))}
                      className="rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.06]"
                    >
                      {isSelectedFilter ? "Ver todas" : "Filtrar caixa"}
                    </button>
                    <button
                      type="button"
                      onClick={() => resetMailboxForm(mailbox)}
                      className="rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.06]"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMailbox(mailbox.id)}
                      className="rounded-2xl border border-rose-300/20 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/10"
                    >
                      Remover
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <aside className={panelClass}>
            <div className="flex items-start gap-3">
              <span className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-2 text-cyan-100">
                <Settings2 className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Conexao</p>
                <h3 className="mt-1 text-lg font-semibold text-white">Pronto para sair da HostGator</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  O dominio pode continuar registrado na Squarespace, mas o DNS e o site devem apontar para a Vercel. As caixas abaixo vao viver dentro do sistema.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <ConnectionRow label="Site publicado" value={config.siteUrl || "Defina NEXT_PUBLIC_SITE_URL na Vercel"} ok={Boolean(config.siteUrl)} />
              <ConnectionRow label="Webhook de entrada" value={config.inboundWebhookUrl} ok={true} copyValue={config.inboundWebhookUrl} onCopy={copyWebhook} copied={copied} />
              <ConnectionRow label="Envio Resend" value={config.canSend ? "RESEND_API_KEY configurada" : "RESEND_API_KEY pendente"} ok={config.canSend} />
              <ConnectionRow label="Segredo inbound" value={config.webhookSecretConfigured ? "EMAIL_WEBHOOK_SECRET configurado" : "EMAIL_WEBHOOK_SECRET pendente"} ok={config.webhookSecretConfigured} />
              <ConnectionRow label="Nameservers Vercel" value="ns1.vercel-dns.com / ns2.vercel-dns.com" ok={false} />
            </div>
          </aside>

          <form onSubmit={handleMailboxSubmit} className={panelClass}>
            <div className="flex items-start gap-3">
              <span className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-2 text-cyan-100">
                <Mail className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Editor de caixa</p>
                <h3 className="mt-1 text-lg font-semibold text-white">{editingMailboxId ? "Editar caixa" : "Nova caixa"}</h3>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <div>
                <label className={labelClass}>Nome da caixa</label>
                <input value={mailboxDraft.label} onChange={(event) => setMailboxDraft((current) => ({ ...current, label: event.target.value }))} className={inputClass} placeholder="Comercial" required />
              </div>
              <div>
                <label className={labelClass}>Endereco</label>
                <input value={mailboxDraft.email} onChange={(event) => setMailboxDraft((current) => ({ ...current, email: event.target.value.toLowerCase() }))} className={inputClass} placeholder="comercial@fozemdestaque.com" required />
              </div>
              <div>
                <label className={labelClass}>Descricao</label>
                <textarea value={mailboxDraft.description} onChange={(event) => setMailboxDraft((current) => ({ ...current, description: event.target.value }))} className={cn(inputClass, "min-h-[112px] resize-y leading-6")} placeholder="Publicidade, marcas e negociacoes." />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-200">
                <span>Caixa ativa</span>
                <input type="checkbox" checked={mailboxDraft.active} onChange={(event) => setMailboxDraft((current) => ({ ...current, active: event.target.checked }))} className="h-4 w-4 accent-cyan-300" />
              </label>
              <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-200">
                <span>Usar como padrao</span>
                <input type="checkbox" checked={mailboxDraft.isDefault} onChange={(event) => setMailboxDraft((current) => ({ ...current, isDefault: event.target.checked }))} className="h-4 w-4 accent-cyan-300" />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button type="submit" disabled={savingMailbox} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-200 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">
                {savingMailbox ? <RefreshCw className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                {editingMailboxId ? "Salvar caixa" : "Criar caixa"}
              </button>
              <button type="button" onClick={() => resetMailboxForm(null)} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]">
                Limpar
              </button>
            </div>

            {mailboxFeedback && (
              <div className={cn("mt-4 rounded-2xl border px-4 py-3 text-sm", mailboxFeedback.type === "success" ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100" : "border-rose-300/20 bg-rose-300/10 text-rose-100")}>
                {mailboxFeedback.text}
              </div>
            )}
          </form>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard icon={<Inbox className="h-5 w-5" />} label="Entrada" value={counts.inbox} detail={`${counts.unread} nao lidos`} />
          <MetricCard icon={<MailCheck className="h-5 w-5" />} label="Enviados" value={counts.sent} detail="Historico do painel" />
          <MetricCard icon={<Mail className="h-5 w-5" />} label="Total" value={counts.all} detail="Mensagens registradas" />
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#0b1220] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.25)]">
          <div className="flex items-start gap-3">
            <span className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-2 text-cyan-100">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Sistema</p>
              <h3 className="mt-1 text-lg font-semibold text-white">Caixas ativas</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {activeMailboxes.length} caixa(s) prontas para enviar e receber dentro do admin.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <FilterChip active={mailboxFilter === "all"} label={`Todas (${messages.length})`} onClick={() => setMailboxFilter("all")} />
            {activeMailboxes.map((mailbox) => (
              <FilterChip
                key={mailbox.id}
                active={mailboxFilter === mailbox.email}
                label={`${mailbox.label} (${mailboxCounts[mailbox.email] ?? 0})`}
                onClick={() => setMailboxFilter(mailbox.email)}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 2xl:grid-cols-[430px_minmax(0,1fr)]">
        <div className={panelClass}>
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
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <MailboxPill email={message.mailboxEmail} />
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
          <form onSubmit={handleSend} className={panelClass}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-200/80">Compositor</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Enviar email</h2>
                <p className="mt-2 text-sm text-slate-400">Escolha a caixa de saida e envie direto pelo painel.</p>
              </div>
              <div className={cn("rounded-2xl border px-4 py-3 text-sm", config.canSend ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100" : "border-amber-300/20 bg-amber-300/10 text-amber-100")}>
                {config.canSend ? "Envio ativo" : "RESEND_API_KEY pendente"}
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <div>
                <label className={labelClass}>Enviar como</label>
                <select value={composeMailbox} onChange={(event) => setComposeMailbox(event.target.value)} className={inputClass}>
                  {activeMailboxes.map((mailbox) => (
                    <option key={mailbox.id} value={mailbox.email}>
                      {mailbox.label} - {mailbox.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Responder para (opcional)</label>
                <input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} className={inputClass} placeholder={composeMailbox || "contato@fozemdestaque.com"} />
              </div>
            </div>
            <div className="mt-4">
              <label className={labelClass}>Destinatario(s)</label>
              <input value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} placeholder="cliente@email.com, outro@email.com" required />
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
              <p className="text-xs text-slate-500">Caixa de saida: {composeMailbox || config.fromAddress}</p>
              <button type="submit" disabled={sending || !config.canSend || !composeMailbox} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-200 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">
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
      <div className={`${panelClass} text-center text-sm text-slate-500`}>
        Selecione uma mensagem para ver os detalhes.
      </div>
    );
  }

  return (
    <article className={panelClass}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={message.status} />
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-400">
              {message.direction === "inbound" ? "Recebido" : "Enviado"}
            </span>
            <MailboxPill email={message.mailboxEmail} />
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
        {message.mailboxEmail && <p><span className="text-slate-500">Caixa:</span> {message.mailboxEmail}</p>}
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

function MetricCard({ icon, label, value, detail }: { icon: ReactNode; label: string; value: number; detail: string }) {
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

function ConnectionRow({
  label,
  value,
  ok,
  copyValue,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  ok: boolean;
  copyValue?: string;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-2 break-words text-sm font-medium text-slate-200">{value}</p>
        </div>
        <span className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]", ok ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100" : "border-amber-300/20 bg-amber-300/10 text-amber-100")}>
          {ok ? "Ok" : "Pendente"}
        </span>
      </div>
      {copyValue && onCopy && (
        <button type="button" onClick={onCopy} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-cyan-100 hover:text-white">
          <Copy className="h-4 w-4" />
          {copied ? "Copiado" : "Copiar valor"}
        </button>
      )}
    </div>
  );
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition",
        active ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
      )}
    >
      {label}
    </button>
  );
}

function MailboxPill({ email }: { email: string | null }) {
  if (!email) {
    return (
      <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        Sem caixa
      </span>
    );
  }

  return (
    <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
      {email}
    </span>
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

function createMailboxDraft(mailbox?: Pick<AdminEmailMailbox, "label" | "email" | "description" | "active" | "isDefault"> | null): MailboxDraft {
  return {
    label: mailbox?.label || "",
    email: mailbox?.email || "",
    description: mailbox?.description || "",
    active: mailbox?.active ?? true,
    isDefault: mailbox?.isDefault ?? false,
  };
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
