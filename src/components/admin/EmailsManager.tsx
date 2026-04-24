"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import {
  BadgeCheck,
  Check,
  CheckCheck,
  Copy,
  Inbox,
  Mail,
  MailCheck,
  PenSquare,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Trash2,
  Webhook,
  X,
  XCircle,
} from "lucide-react";
import { MAX_EMAIL_MAILBOXES } from "@/lib/email-mailbox-config";
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

const tabs: Array<{
  key: TabKey;
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    key: "inbox",
    label: "Entrada",
    description: "Mensagens recebidas",
    icon: <Inbox className="h-4 w-4" />,
  },
  {
    key: "sent",
    label: "Enviados",
    description: "Respostas e disparos",
    icon: <MailCheck className="h-4 w-4" />,
  },
  {
    key: "all",
    label: "Todos",
    description: "Visao completa",
    icon: <Mail className="h-4 w-4" />,
  },
];

const inputClass =
  "admin-email-input w-full rounded-2xl border border-white/10 bg-[#09111f] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10";
const labelClass = "mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500";
const panelClass =
  "admin-email-panel rounded-[30px] border border-white/10 bg-[#09111d] shadow-[0_24px_70px_rgba(0,0,0,0.28)]";

export function EmailsManager({ messages, mailboxes, config }: EmailsManagerProps) {
  const router = useRouter();
  const activeMailboxes = useMemo(
    () => mailboxes.filter((mailbox) => mailbox.active).sort((a, b) => a.order - b.order),
    [mailboxes]
  );
  const defaultMailbox =
    activeMailboxes.find((mailbox) => mailbox.isDefault) ?? activeMailboxes[0] ?? null;

  const [activeTab, setActiveTab] = useState<TabKey>("inbox");
  const [mailboxFilter, setMailboxFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [composeMailbox, setComposeMailbox] = useState(defaultMailbox?.email ?? "");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [copied, setCopied] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [editingMailboxId, setEditingMailboxId] = useState<string | null>(null);
  const [mailboxDraft, setMailboxDraft] = useState<MailboxDraft>(() => createMailboxDraft(null));
  const [savingMailbox, setSavingMailbox] = useState(false);
  const [readOverrides, setReadOverrides] = useState<Record<string, boolean>>({});
  const [mailboxFeedback, setMailboxFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (
      !composeMailbox ||
      !activeMailboxes.some((mailbox) => mailbox.email === composeMailbox)
    ) {
      setComposeMailbox(defaultMailbox?.email ?? "");
    }
  }, [activeMailboxes, composeMailbox, defaultMailbox]);

  const messagesWithReadState = useMemo(
    () =>
      messages.map((message) => ({
        ...message,
        read: readOverrides[message.id] ?? message.read,
      })),
    [messages, readOverrides]
  );

  const counts = useMemo(() => {
    return {
      inbox: messagesWithReadState.filter((message) => message.direction === "inbound").length,
      sent: messagesWithReadState.filter((message) => message.direction === "outbound").length,
      all: messagesWithReadState.length,
      unread: messagesWithReadState.filter(
        (message) => message.direction === "inbound" && !message.read
      ).length,
    };
  }, [messagesWithReadState]);

  const mailboxCounts = useMemo(() => {
    return mailboxes.reduce<Record<string, number>>((acc, mailbox) => {
      acc[mailbox.email] = messages.filter(
        (message) => message.mailboxEmail === mailbox.email
      ).length;
      return acc;
    }, {});
  }, [mailboxes, messages]);

  const filteredMessages = useMemo(() => {
    const byTab =
      activeTab === "inbox"
        ? messagesWithReadState.filter((message) => message.direction === "inbound")
        : activeTab === "sent"
          ? messagesWithReadState.filter((message) => message.direction === "outbound")
          : messagesWithReadState;

    const byMailbox =
      mailboxFilter === "all"
        ? byTab
        : byTab.filter((message) => message.mailboxEmail === mailboxFilter);

    const term = searchQuery.trim().toLowerCase();
    if (!term) return byMailbox;

    return byMailbox.filter((message) => {
      const haystack = [
        message.subject,
        message.fromName,
        message.fromEmail,
        message.toEmail,
        message.mailboxEmail,
        messagePreview(message),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [activeTab, mailboxFilter, messagesWithReadState, searchQuery]);

  useEffect(() => {
    if (!filteredMessages.length) {
      setSelectedId("");
      return;
    }

    if (!filteredMessages.some((message) => message.id === selectedId)) {
      setSelectedId("");
    }
  }, [filteredMessages, selectedId]);

  const selectedMessage =
    filteredMessages.find((message) => message.id === selectedId) || null;
  const activeTabMeta = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];
  const selectedMailbox =
    mailboxFilter === "all"
      ? null
      : activeMailboxes.find((mailbox) => mailbox.email === mailboxFilter) ?? null;
  const mailboxLimitReached =
    !editingMailboxId && mailboxes.length >= MAX_EMAIL_MAILBOXES;

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!config.canSend) {
      setFeedback({
        type: "error",
        text: "Configure RESEND_API_KEY na Vercel para habilitar o envio.",
      });
      return;
    }

    if (!composeMailbox) {
      setFeedback({
        type: "error",
        text: "Cadastre e ative ao menos uma caixa em Configurar Emails.",
      });
      return;
    }

    setSending(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body, replyTo, mailboxEmail: composeMailbox }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Nao foi possivel enviar o email.");
      }

      setTo("");
      setSubject("");
      setBody("");
      setReplyTo("");
      setFeedback({ type: "success", text: "Email enviado e registrado no historico." });
      router.refresh();
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao enviar email.",
      });
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  async function markRead(id: string, read: boolean) {
    const previousRead =
      filteredMessages.find((message) => message.id === id)?.read ??
      messagesWithReadState.find((message) => message.id === id)?.read ??
      false;

    setReadOverrides((current) => ({ ...current, [id]: read }));

    const response = await fetch(`/api/admin/emails/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read }),
    });

    if (!response.ok) {
      setReadOverrides((current) => ({ ...current, [id]: previousRead }));
      return;
    }

    router.refresh();
  }

  function handleSelectMessage(message: AdminEmailMessage) {
    setSelectedId(message.id);

    if (message.direction === "inbound" && !message.read) {
      void markRead(message.id, true);
    }
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

  function openMailboxEditor(mailbox?: AdminEmailMailbox | null) {
    resetMailboxForm(mailbox ?? null);
    setConfigOpen(true);
  }

  function startNewMessage() {
    setComposeMailbox(defaultMailbox?.email ?? composeMailbox ?? "");
    setTo("");
    setSubject("");
    setBody("");
    setReplyTo("");
    setFeedback(null);
    setComposeOpen(true);
  }

  function replyToMessage(message: AdminEmailMessage) {
    const senderName = message.fromName ? `${message.fromName} <${message.fromEmail}>` : message.fromEmail;
    setComposeMailbox(message.mailboxEmail ?? defaultMailbox?.email ?? composeMailbox ?? "");
    setTo(message.fromEmail);
    setReplyTo("");
    setSubject(message.subject.startsWith("Re:") ? message.subject : `Re: ${message.subject}`);
    setBody(
      `\n\n---\nEm ${formatDate(message.createdAt)}, ${senderName} escreveu:\n${messagePreview(
        message
      )}`
    );
    setFeedback(null);
    setComposeOpen(true);
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

      const response = await fetch(
        editingMailboxId
          ? `/api/admin/email-mailboxes/${editingMailboxId}`
          : "/api/admin/email-mailboxes",
        {
          method: editingMailboxId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Nao foi possivel salvar a caixa.");
      }

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

    const response = await fetch(`/api/admin/email-mailboxes/${id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMailboxFeedback({
        type: "error",
        text: data?.error || "Nao foi possivel remover a caixa.",
      });
      return;
    }

    if (editingMailboxId === id) {
      resetMailboxForm(defaultMailbox);
    }

    router.refresh();
  }

  return (
    <div className="admin-email-shell space-y-5 text-slate-100">
      <section className={cn(panelClass, "overflow-hidden p-4 md:p-5")}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200/80">
              Workspace de emails
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-[2rem]">
              Uma central mais limpa, com leitura e resposta em foco
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              A configuracao das caixas fica escondida em um painel lateral para a tela principal
              respirar melhor. Aqui a prioridade passa a ser leitura, busca e resposta.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 sm:w-[320px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className={cn(inputClass, "pl-11")}
                placeholder="Buscar por assunto, remetente ou conteudo"
              />
            </div>

            <button
              type="button"
              onClick={() => setConfigOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]"
            >
              <Settings2 className="h-4 w-4" />
              Configurar emails
            </button>

            <button
              type="button"
              onClick={startNewMessage}
              disabled={!activeMailboxes.length}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-200 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PenSquare className="h-4 w-4" />
              Nova mensagem
            </button>
          </div>
        </div>
      </section>

      <section
        className={cn(
          "grid gap-5",
          selectedMessage
            ? "xl:grid-cols-[240px_minmax(0,420px)_minmax(0,1fr)]"
            : "xl:grid-cols-[240px_minmax(0,1fr)]"
        )}
      >
        <aside className={cn(panelClass, "overflow-hidden")}>
          <div className="border-b border-white/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Caixa
              </p>
              <button
                type="button"
                onClick={() => setConfigOpen(true)}
                className="rounded-full border border-white/10 p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                aria-label="Abrir configuracao de caixas"
              >
                <Settings2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3">
              <select
                value={mailboxFilter}
                onChange={(event) => setMailboxFilter(event.target.value)}
                className={inputClass}
              >
                <option value="all">Todas as caixas</option>
                {activeMailboxes.map((mailbox) => (
                  <option key={mailbox.id} value={mailbox.email}>
                    {mailbox.label} - {mailbox.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-b border-white/10 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Resumo rapido
            </p>
            <div className="mt-4 space-y-2">
              <SidebarMetricRow
                label="Entrada"
                value={counts.inbox}
                detail={`${counts.unread} nao lidos`}
              />
              <SidebarMetricRow label="Enviados" value={counts.sent} detail="Historico" />
              <SidebarMetricRow
                label="Caixas internas"
                value={activeMailboxes.length}
                detail="Ativas"
              />
            </div>
          </div>

          <div className="space-y-6 p-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Pastas
              </p>
              <div className="mt-3 space-y-2">
                {tabs.map((tab) => (
                  <TabRailButton
                    key={tab.key}
                    active={activeTab === tab.key}
                    icon={tab.icon}
                    label={tab.label}
                    count={counts[tab.key]}
                    onClick={() => setActiveTab(tab.key)}
                  />
                ))}
              </div>
            </div>

          </div>
        </aside>

        <section className={cn(panelClass, "overflow-hidden")}>
          <div className="border-b border-white/10 px-4 py-4 md:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {activeTabMeta.label}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  {selectedMailbox?.label ?? activeTabMeta.label}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Clique em uma mensagem para abrir a leitura.
                </p>
              </div>

              <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                {filteredMessages.length} resultado(s)
              </div>
            </div>
          </div>

          <div className="max-h-[820px] overflow-y-auto portal-scrollbar">
            {filteredMessages.length === 0 ? (
              <div className="flex min-h-[340px] flex-col items-center justify-center px-6 text-center">
                <Inbox className="h-10 w-10 text-slate-600" />
                <p className="mt-4 text-lg font-semibold text-white">Nada por aqui ainda</p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Ajuste os filtros ou aguarde novas mensagens chegarem nesta caixa.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/8">
                {filteredMessages.map((message) => (
                  <MessageRow
                    key={message.id}
                    message={message}
                    active={selectedMessage?.id === message.id}
                    showMailbox={mailboxFilter === "all"}
                    onClick={() => handleSelectMessage(message)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {selectedMessage && (
          <EmailReadingPane
            message={selectedMessage}
            onDelete={deleteMessage}
            onMarkRead={markRead}
            onReply={replyToMessage}
            onClose={() => setSelectedId("")}
          />
        )}
      </section>

      {composeOpen && (
        <div className="admin-email-overlay fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm">
          <div className="flex h-full justify-end p-4 md:p-6">
            <div className="admin-email-drawer flex h-full w-full max-w-[680px] flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#08101c] shadow-[0_34px_120px_rgba(0,0,0,0.5)]">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5 md:px-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-200/80">
                    Novo envio
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">Escrever mensagem</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Escolha a caixa de saida e envie direto pelo portal.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  className="rounded-full border border-white/10 p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label="Fechar compositor"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSend} className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6 portal-scrollbar">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Enviar como</label>
                      <select
                        value={composeMailbox}
                        onChange={(event) => setComposeMailbox(event.target.value)}
                        className={inputClass}
                      >
                        {activeMailboxes.map((mailbox) => (
                          <option key={mailbox.id} value={mailbox.email}>
                            {mailbox.label} - {mailbox.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Responder para (opcional)</label>
                      <input
                        value={replyTo}
                        onChange={(event) => setReplyTo(event.target.value)}
                        className={inputClass}
                        placeholder={composeMailbox || "contato@fozemdestaque.com"}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className={labelClass}>Destinatario(s)</label>
                    <input
                      value={to}
                      onChange={(event) => setTo(event.target.value)}
                      className={inputClass}
                      placeholder="cliente@email.com, outro@email.com"
                      required
                    />
                  </div>

                  <div className="mt-4">
                    <label className={labelClass}>Assunto</label>
                    <input
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      className={inputClass}
                      placeholder="Assunto do email"
                      required
                    />
                  </div>

                  <div className="mt-4">
                    <label className={labelClass}>Mensagem</label>
                    <textarea
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      className={cn(inputClass, "min-h-[320px] resize-y leading-7")}
                      placeholder="Escreva a mensagem aqui..."
                      required
                    />
                  </div>

                  {feedback && (
                    <div
                      className={cn(
                        "mt-4 rounded-2xl border px-4 py-3 text-sm",
                        feedback.type === "success"
                          ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                          : "border-rose-300/20 bg-rose-300/10 text-rose-100"
                      )}
                    >
                      {feedback.text}
                    </div>
                  )}
                </div>

                <div className="border-t border-white/10 px-5 py-4 md:px-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500">
                      Saindo por: {composeMailbox || config.fromAddress}
                    </p>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setComposeOpen(false)}
                        className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]"
                      >
                        Fechar
                      </button>
                      <button
                        type="submit"
                        disabled={sending || !config.canSend || !composeMailbox}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-200 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {sending ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Enviar email
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {configOpen && (
        <div className="admin-email-overlay fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm">
          <div className="flex h-full justify-end p-4 md:p-6">
            <div className="admin-email-drawer flex h-full w-full max-w-[560px] flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#08101c] shadow-[0_34px_120px_rgba(0,0,0,0.5)]">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5 md:px-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-200/80">
                    Configurar emails
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">
                    Caixas internas do portal
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Tudo o que era painel solto agora fica concentrado aqui: status do sistema,
                    webhook e gestao das caixas.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setConfigOpen(false)}
                  className="rounded-full border border-white/10 p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label="Fechar configuracao"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6 portal-scrollbar">
                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="max-w-md">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Infraestrutura
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        Conexao da central pronta para operar
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Os detalhes tecnicos ficam recolhidos para a interface nao parecer um painel
                        de servidor.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <InlineStatusTag
                        label={config.canSend ? "Envio ativo" : "Envio pendente"}
                        ok={config.canSend}
                      />
                      <InlineStatusTag
                        label={
                          config.webhookSecretConfigured
                            ? "Inbound protegido"
                            : "Secret pendente"
                        }
                        ok={config.webhookSecretConfigured}
                      />
                    </div>
                  </div>

                  <details className="mt-4 group">
                    <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 transition hover:text-white">
                      Ver detalhes tecnicos
                    </summary>

                    <div className="mt-4 grid gap-3">
                      <TechnicalLine
                        icon={<ShieldCheck className="h-4 w-4" />}
                        label="Envio Resend"
                        value={
                          config.canSend
                            ? "RESEND_API_KEY configurada"
                            : "RESEND_API_KEY pendente"
                        }
                        ok={config.canSend}
                      />
                      <TechnicalLine
                        icon={<BadgeCheck className="h-4 w-4" />}
                        label="Segredo inbound"
                        value={
                          config.webhookSecretConfigured
                            ? "EMAIL_WEBHOOK_SECRET configurado"
                            : "EMAIL_WEBHOOK_SECRET pendente"
                        }
                        ok={config.webhookSecretConfigured}
                      />
                      <TechnicalLine
                        icon={<Mail className="h-4 w-4" />}
                        label="Remetente padrao"
                        value={defaultMailbox?.email || config.fromAddress}
                        ok={Boolean(defaultMailbox?.email || config.fromAddress)}
                      />
                      <TechnicalLine
                        icon={<Webhook className="h-4 w-4" />}
                        label="Webhook de entrada"
                        value={config.inboundWebhookUrl}
                        ok={true}
                        actionLabel={copied ? "Copiado" : "Copiar"}
                        onAction={copyWebhook}
                      />
                    </div>
                  </details>
                </div>

                <div className="mt-5 rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Caixas cadastradas
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {mailboxes.length} caixa(s) internas
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Limite de {MAX_EMAIL_MAILBOXES} caixas.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openMailboxEditor(null)}
                      disabled={mailboxes.length >= MAX_EMAIL_MAILBOXES}
                      className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Plus className="h-4 w-4" />
                      Nova
                    </button>
                  </div>

                  <div className="mt-4 space-y-2">
                    {mailboxes.map((mailbox) => {
                      const selected = editingMailboxId === mailbox.id;
                      return (
                        <div
                          key={mailbox.id}
                          className={cn(
                            "rounded-[22px] border px-4 py-3 transition",
                            selected
                              ? "border-cyan-300/30 bg-cyan-300/10"
                              : "border-white/10 bg-[#0a1220]"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold text-white">
                                  {mailbox.label}
                                </p>
                                {mailbox.isDefault && (
                                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-100">
                                    Padrao
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 truncate text-xs text-slate-400">
                                {mailbox.email}
                              </p>
                            </div>

                            <span
                              className={cn(
                                "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]",
                                mailbox.active
                                  ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                                  : "border-white/10 bg-white/[0.04] text-slate-400"
                              )}
                            >
                              {mailbox.active ? "Ativa" : "Pausada"}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                              {mailboxCounts[mailbox.email] ?? 0} mensagens
                            </span>
                            <button
                              type="button"
                              onClick={() => setMailboxFilter(mailbox.email)}
                              className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300 transition hover:bg-white/[0.06]"
                            >
                              Filtrar
                            </button>
                            <button
                              type="button"
                              onClick={() => openMailboxEditor(mailbox)}
                              className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300 transition hover:bg-white/[0.06]"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMailbox(mailbox.id)}
                              className="rounded-full border border-rose-300/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-rose-100 transition hover:bg-rose-500/10"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <form onSubmit={handleMailboxSubmit} className="mt-5 rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start gap-3">
                    <span className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-2 text-cyan-100">
                      <Mail className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Editor de caixa
                      </p>
                      <h4 className="mt-2 text-lg font-semibold text-white">
                        {editingMailboxId ? "Editar caixa" : "Nova caixa"}
                      </h4>
                      {!editingMailboxId && (
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {mailboxes.length}/{MAX_EMAIL_MAILBOXES} caixas em uso.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4">
                    <div>
                      <label className={labelClass}>Nome da caixa</label>
                      <input
                        value={mailboxDraft.label}
                        onChange={(event) =>
                          setMailboxDraft((current) => ({
                            ...current,
                            label: event.target.value,
                          }))
                        }
                        className={inputClass}
                        placeholder="Comercial"
                        required
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Endereco</label>
                      <input
                        value={mailboxDraft.email}
                        onChange={(event) =>
                          setMailboxDraft((current) => ({
                            ...current,
                            email: event.target.value.toLowerCase(),
                          }))
                        }
                        className={inputClass}
                        placeholder="comercial@fozemdestaque.com"
                        required
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Descricao</label>
                      <textarea
                        value={mailboxDraft.description}
                        onChange={(event) =>
                          setMailboxDraft((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        className={cn(inputClass, "min-h-[112px] resize-y leading-6")}
                        placeholder="Publicidade, marcas e negociacoes."
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0a1220] px-4 py-3 text-sm font-semibold text-slate-200">
                      <span>Caixa ativa</span>
                      <input
                        type="checkbox"
                        checked={mailboxDraft.active}
                        onChange={(event) =>
                          setMailboxDraft((current) => ({
                            ...current,
                            active: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 accent-cyan-300"
                      />
                    </label>

                    <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0a1220] px-4 py-3 text-sm font-semibold text-slate-200">
                      <span>Usar como padrao</span>
                      <input
                        type="checkbox"
                        checked={mailboxDraft.isDefault}
                        onChange={(event) =>
                          setMailboxDraft((current) => ({
                            ...current,
                            isDefault: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 accent-cyan-300"
                      />
                    </label>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={savingMailbox || mailboxLimitReached}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-200 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingMailbox ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <BadgeCheck className="h-4 w-4" />
                      )}
                      {editingMailboxId ? "Salvar caixa" : "Criar caixa"}
                    </button>

                    <button
                      type="button"
                      onClick={() => resetMailboxForm(null)}
                      className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]"
                    >
                      Limpar
                    </button>
                  </div>

                  {mailboxLimitReached && (
                    <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                      Limite atingido: remova uma caixa antes de criar a proxima.
                    </div>
                  )}

                  {mailboxFeedback && (
                    <div
                      className={cn(
                        "mt-4 rounded-2xl border px-4 py-3 text-sm",
                        mailboxFeedback.type === "success"
                          ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                          : "border-rose-300/20 bg-rose-300/10 text-rose-100"
                      )}
                    >
                      {mailboxFeedback.text}
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmailReadingPane({
  message,
  onDelete,
  onMarkRead,
  onReply,
  onClose,
}: {
  message: AdminEmailMessage | null;
  onDelete: (id: string) => void;
  onMarkRead: (id: string, read: boolean) => void;
  onReply: (message: AdminEmailMessage) => void;
  onClose: () => void;
}) {
  if (!message) {
    return (
      <div className={cn(panelClass, "flex min-h-[780px] items-center justify-center p-10")}>
        <div className="max-w-sm text-center">
          <Mail className="mx-auto h-10 w-10 text-slate-600" />
          <p className="mt-4 text-xl font-semibold text-white">Selecione uma mensagem</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            A leitura completa aparece aqui, com foco no conteudo e nas acoes principais.
          </p>
        </div>
      </div>
    );
  }

  return (
    <article className={cn(panelClass, "flex min-h-[780px] flex-col overflow-hidden")}>
      <div className="border-b border-white/10 px-5 py-5 md:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={message.status} />
              <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {message.direction === "inbound" ? "Recebido" : "Enviado"}
              </span>
              <MailboxPill email={message.mailboxEmail} />
            </div>

            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white md:text-[2rem]">
              {message.subject}
            </h2>
            <p className="mt-2 text-sm text-slate-500">{formatDate(message.createdAt)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]"
            >
              <X className="h-4 w-4" />
              Fechar
            </button>

            {message.direction === "inbound" && (
              <button
                type="button"
                onClick={() => onReply(message)}
                className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
              >
                <Reply className="h-4 w-4" />
                Responder
              </button>
            )}

            {message.direction === "inbound" && (
              <button
                type="button"
                onClick={() => onMarkRead(message.id, !message.read)}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]"
              >
                <CheckCheck className="h-4 w-4" />
                {message.read ? "Marcar nao lido" : "Marcar lido"}
              </button>
            )}

            <button
              type="button"
              onClick={() => onDelete(message.id)}
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/20 px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/10"
            >
              <Trash2 className="h-4 w-4" />
              Remover
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <MetaCard
            label="De"
            value={
              message.fromName
                ? `${message.fromName} <${message.fromEmail}>`
                : message.fromEmail
            }
          />
          <MetaCard label="Para" value={message.toEmail} />
          {message.mailboxEmail && <MetaCard label="Caixa" value={message.mailboxEmail} />}
          {message.provider && <MetaCard label="Origem" value={message.provider} />}
          {message.providerId && <MetaCard label="ID provedor" value={message.providerId} />}
        </div>
      </div>

      {message.error && (
        <div className="border-b border-rose-300/10 bg-rose-500/10 px-5 py-4 text-sm text-rose-100 md:px-6">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{message.error}</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6 portal-scrollbar">
        <div className="admin-email-reading-surface mx-auto max-w-3xl rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(7,13,24,0.92)_100%)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:p-8">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Corpo da mensagem
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Visualizacao focada no conteudo, com leitura mais limpa.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              {message.direction === "inbound" ? "Inbox" : "Sent"}
            </span>
          </div>

          <div className="mt-6 whitespace-pre-wrap text-[15px] leading-8 text-slate-200">
            {messagePreview(message)}
          </div>
        </div>
      </div>
    </article>
  );
}

function MessageRow({
  message,
  active,
  showMailbox,
  onClick,
}: {
  message: AdminEmailMessage;
  active: boolean;
  showMailbox: boolean;
  onClick: () => void;
}) {
  const identity = getMessageIdentity(message);
  const unread = message.direction === "inbound" && !message.read;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full px-4 py-4 text-left transition md:px-5",
        active
          ? "bg-cyan-300/8 shadow-[inset_3px_0_0_rgba(103,232,249,0.8)]"
          : unread
            ? "bg-cyan-300/[0.05] hover:bg-cyan-300/[0.08]"
            : "bg-transparent hover:bg-white/[0.03]"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold uppercase",
            unread ? "bg-cyan-300/15 text-cyan-100" : "bg-white/[0.05] text-slate-400"
          )}
        >
          {identity.initial}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p
                  className={cn(
                    "truncate text-sm text-white",
                    unread ? "font-semibold" : "font-medium"
                  )}
                >
                  {identity.name}
                </p>
                {message.status === "failed" && <StatusBadge status={message.status} compact />}
              </div>
              <p className="mt-1 truncate text-xs text-slate-500">{identity.secondary}</p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {formatListDate(message.createdAt)}
              </p>
              <ReadStateIcon message={message} compact />
            </div>
          </div>

          <div className="mt-3">
            <p className={cn("line-clamp-1 text-sm text-white", unread ? "font-semibold" : "font-medium")}>
              {message.subject || "(Sem assunto)"}
            </p>
            <p className="mt-1 line-clamp-1 text-sm leading-6 text-slate-500">
              {messagePreview(message)}
            </p>
          </div>

          {showMailbox && message.mailboxEmail && (
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100/80">
              {message.mailboxEmail}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

function SidebarMetricRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-xs text-slate-500">{detail}</p>
      </div>
      <p className="text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function ReadStateIcon({
  message,
  compact = false,
}: {
  message: AdminEmailMessage;
  compact?: boolean;
}) {
  const sizeClass = compact ? "h-3.5 w-3.5" : "h-4 w-4";

  if (message.direction !== "inbound") {
    return null;
  }

  if (message.read) {
    return <CheckCheck className={cn(sizeClass, "text-cyan-500")} aria-label="Visualizado" />;
  }

  return <Check className={cn(sizeClass, "text-slate-400")} aria-label="Nao visualizado" />;
}

function TabRailButton({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-[20px] border px-4 py-3 text-left transition",
        active
          ? "border-cyan-300/30 bg-cyan-300/10 text-white"
          : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
      )}
    >
      <span
        className={cn(
          "mt-0.5 rounded-2xl border p-2",
          active
            ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
            : "border-white/10 bg-white/[0.03] text-slate-400"
        )}
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <p className="text-sm font-semibold">{label}</p>
        <span className="text-sm font-semibold">{count}</span>
      </div>
    </button>
  );
}

function InlineStatusTag({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em]",
        ok
          ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
          : "border-amber-300/20 bg-amber-300/10 text-amber-100"
      )}
    >
      {label}
    </span>
  );
}

function TechnicalLine({
  icon,
  label,
  value,
  ok,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  ok: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[22px] border border-white/10 bg-[#0a1220] p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            "rounded-2xl border p-2",
            ok
              ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
              : "border-amber-300/20 bg-amber-300/10 text-amber-100"
          )}
        >
          {icon}
        </span>

        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 break-words text-sm leading-6 text-slate-200">{value}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:flex-col sm:items-end">
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]",
            ok
              ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
              : "border-amber-300/20 bg-amber-300/10 text-amber-100"
          )}
        >
          {ok ? "Ok" : "Pendente"}
        </span>

        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-100 transition hover:text-white"
          >
            <Copy className="h-4 w-4" />
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium leading-6 text-slate-200">{value}</p>
    </div>
  );
}

function MailboxPill({ email, compact = false }: { email: string | null; compact?: boolean }) {
  if (!email) {
    return (
      <span
        className={cn(
          "rounded-full border border-white/10 bg-white/[0.03] font-semibold uppercase tracking-[0.16em] text-slate-500",
          compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1 text-[11px]"
        )}
      >
        Sem caixa
      </span>
    );
  }

  return (
    <span
      className={cn(
        "rounded-full border border-cyan-300/20 bg-cyan-300/10 font-semibold uppercase tracking-[0.16em] text-cyan-100",
        compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1 text-[11px]"
      )}
    >
      {email}
    </span>
  );
}

function StatusBadge({ status, compact = false }: { status: string; compact?: boolean }) {
  const styles = {
    sent: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
    received: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    failed: "border-rose-300/20 bg-rose-300/10 text-rose-100",
  } as Record<string, string>;

  const label = status === "sent" ? "Enviado" : status === "failed" ? "Falhou" : "Recebido";

  return (
    <span
      className={cn(
        "rounded-full border font-bold uppercase tracking-[0.16em]",
        compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1 text-[11px]",
        styles[status] ?? styles.received
      )}
    >
      {label}
    </span>
  );
}

function createMailboxDraft(
  mailbox?: Pick<
    AdminEmailMailbox,
    "label" | "email" | "description" | "active" | "isDefault"
  > | null
): MailboxDraft {
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
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getMessageIdentity(message: AdminEmailMessage) {
  const primary =
    message.direction === "inbound"
      ? message.fromName || message.fromEmail
      : message.toEmail;

  return {
    name: primary,
    secondary:
      message.direction === "inbound"
        ? message.fromEmail
        : `Para ${message.toEmail}`,
    initial: primary.slice(0, 1).toUpperCase(),
  };
}

function formatDate(date: Date | string) {
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

function formatListDate(date: Date | string) {
  return format(new Date(date), "dd MMM HH:mm", { locale: ptBR });
}
