"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
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

type ResizableColumnKey = "sender" | "subject" | "mailbox" | "date";

type ColumnWidths = Record<ResizableColumnKey, number>;

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
const labelClass = "mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-700";
const panelClass =
  "admin-email-panel rounded-[30px] border border-white/10 bg-[#09111d] shadow-[0_24px_70px_rgba(0,0,0,0.28)]";

const avatarToneClasses = [
  "bg-[#17324f] text-white",
  "bg-[#1d3b5c] text-white",
  "bg-[#23415a] text-white",
  "bg-[#2b4153] text-white",
  "bg-[#31455a] text-white",
] as const;

const defaultColumnWidths: ColumnWidths = {
  sender: 230,
  subject: 420,
  mailbox: 220,
  date: 128,
};

const minColumnWidths: ColumnWidths = {
  sender: 180,
  subject: 260,
  mailbox: 180,
  date: 118,
};

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
  const [mailboxOverrides, setMailboxOverrides] = useState<Record<string, string | null>>({});
  const [removedMessageIds, setRemovedMessageIds] = useState<Record<string, true>>({});
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkMoveMailbox, setBulkMoveMailbox] = useState("");
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(defaultColumnWidths);
  const [mailboxFeedback, setMailboxFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const resizeStateRef = useRef<{
    key: ResizableColumnKey;
    startX: number;
    startWidth: number;
  } | null>(null);

  useEffect(() => {
    if (
      !composeMailbox ||
      !activeMailboxes.some((mailbox) => mailbox.email === composeMailbox)
    ) {
      setComposeMailbox(defaultMailbox?.email ?? "");
    }
  }, [activeMailboxes, composeMailbox, defaultMailbox]);

  useEffect(() => {
    if (!bulkMoveMailbox || !activeMailboxes.some((mailbox) => mailbox.email === bulkMoveMailbox)) {
      setBulkMoveMailbox(defaultMailbox?.email ?? "");
    }
  }, [activeMailboxes, bulkMoveMailbox, defaultMailbox]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState) return;

      const nextWidth = Math.max(
        minColumnWidths[resizeState.key],
        Math.round(resizeState.startWidth + (event.clientX - resizeState.startX))
      );

      setColumnWidths((current) => ({
        ...current,
        [resizeState.key]: nextWidth,
      }));
    };

    const stopResize = () => {
      resizeStateRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };
  }, []);

  const messagesWithReadState = useMemo(
    () =>
      messages
        .filter((message) => !removedMessageIds[message.id])
        .map((message) => ({
          ...message,
          read: readOverrides[message.id] ?? message.read,
          mailboxEmail: mailboxOverrides[message.id] ?? message.mailboxEmail,
        })),
    [mailboxOverrides, messages, readOverrides, removedMessageIds]
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
      acc[mailbox.email] = messagesWithReadState.filter(
        (message) => message.mailboxEmail === mailbox.email
      ).length;
      return acc;
    }, {});
  }, [mailboxes, messagesWithReadState]);

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
      setSelectedMessageIds([]);
      return;
    }

    if (!filteredMessages.some((message) => message.id === selectedId)) {
      setSelectedId("");
    }

    setSelectedMessageIds((current) =>
      current.filter((messageId) => filteredMessages.some((message) => message.id === messageId))
    );
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
  const showMailboxColumn = mailboxFilter === "all";
  const selectedMessages = useMemo(
    () => filteredMessages.filter((message) => selectedMessageIds.includes(message.id)),
    [filteredMessages, selectedMessageIds]
  );
  const allVisibleSelected =
    filteredMessages.length > 0 && filteredMessages.every((message) => selectedMessageIds.includes(message.id));
  const someVisibleSelected =
    !allVisibleSelected && filteredMessages.some((message) => selectedMessageIds.includes(message.id));
  const listGridTemplate = getInboxGridTemplate(columnWidths, showMailboxColumn);

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

  function startColumnResize(key: ResizableColumnKey, event: React.PointerEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.stopPropagation();
    resizeStateRef.current = {
      key,
      startX: event.clientX,
      startWidth: columnWidths[key],
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function toggleMessageSelection(messageId: string, checked: boolean) {
    setSelectedMessageIds((current) =>
      checked ? Array.from(new Set([...current, messageId])) : current.filter((id) => id !== messageId)
    );
  }

  function toggleSelectAllVisible(checked: boolean) {
    const visibleIds = filteredMessages.map((message) => message.id);
    setSelectedMessageIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, ...visibleIds]));
      }
      return current.filter((id) => !visibleIds.includes(id));
    });
  }

  async function runBulkAction(action: "delete" | "mark_read" | "mark_unread" | "move") {
    if (selectedMessages.length === 0) return;
    if (action === "delete" && !confirm(`Remover ${selectedMessages.length} email(s) do painel?`)) {
      return;
    }

    if (action === "move" && !bulkMoveMailbox) {
      setFeedback({ type: "error", text: "Escolha uma caixa de destino para mover os emails." });
      return;
    }

    setBulkSubmitting(true);
    setFeedback(null);

    const ids = selectedMessages.map((message) => message.id);
    const previousReads = Object.fromEntries(
      selectedMessages.map((message) => [message.id, message.read])
    );
    const previousMailboxes = Object.fromEntries(
      selectedMessages.map((message) => [message.id, message.mailboxEmail ?? null])
    );

    if (action === "mark_read" || action === "mark_unread") {
      const nextRead = action === "mark_read";
      setReadOverrides((current) => ({
        ...current,
        ...Object.fromEntries(ids.map((id) => [id, nextRead])),
      }));
    }

    if (action === "delete") {
      setRemovedMessageIds((current) => ({
        ...current,
        ...Object.fromEntries(ids.map((id) => [id, true as const])),
      }));
    }

    if (action === "move") {
      setMailboxOverrides((current) => ({
        ...current,
        ...Object.fromEntries(ids.map((id) => [id, bulkMoveMailbox])),
      }));
    }

    try {
      const response = await fetch("/api/admin/emails/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids,
          action,
          mailboxEmail: action === "move" ? bulkMoveMailbox : undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Nao foi possivel executar a acao em massa.");
      }

      if (action === "delete" && ids.includes(selectedId)) {
        setSelectedId("");
      }

      setSelectedMessageIds((current) => current.filter((id) => !ids.includes(id)));
      setFeedback({
        type: "success",
        text:
          action === "delete"
            ? `${ids.length} email(s) removido(s).`
            : action === "move"
              ? `${ids.length} email(s) movido(s) para ${bulkMoveMailbox}.`
              : `${ids.length} email(s) atualizado(s).`,
      });
      router.refresh();
    } catch (error) {
      if (action === "delete") {
        setRemovedMessageIds((current) => {
          const next = { ...current };
          ids.forEach((id) => delete next[id]);
          return next;
        });
      }

      if (action === "mark_read" || action === "mark_unread") {
        setReadOverrides((current) => ({
          ...current,
          ...previousReads,
        }));
      }

      if (action === "move") {
        setMailboxOverrides((current) => ({
          ...current,
          ...previousMailboxes,
        }));
      }

      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao aplicar a acao em massa.",
      });
    } finally {
      setBulkSubmitting(false);
    }
  }

  function handleSelectMessage(message: AdminEmailMessage) {
    setSelectedId(message.id);

    if (message.direction === "inbound" && !message.read) {
      void markRead(message.id, true);
    }
  }

  async function deleteMessage(id: string) {
    if (!confirm("Remover este email do painel?")) return;
    setRemovedMessageIds((current) => ({ ...current, [id]: true }));
    if (selectedId === id) setSelectedId("");
    setSelectedMessageIds((current) => current.filter((messageId) => messageId !== id));

    const response = await fetch(`/api/admin/emails/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setRemovedMessageIds((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setFeedback({ type: "error", text: "Nao foi possivel remover o email." });
      return;
    }

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
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-700">
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-700">
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
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-700">
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
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-700">
                  {activeTabMeta.label}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  {selectedMailbox?.label ?? activeTabMeta.label}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Clique em uma mensagem para abrir a leitura.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                  {filteredMessages.length} resultado(s)
                </span>
                {selectedMessages.length > 0 && (
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                    {selectedMessages.length} selecionado(s)
                  </span>
                )}
              </div>
            </div>

            {selectedMessages.length > 0 && (
              <div className="mt-4 flex flex-col gap-3 rounded-[24px] border border-sky-200 bg-sky-50/90 p-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void runBulkAction("mark_read")}
                    disabled={bulkSubmitting}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Marcar lidos
                  </button>
                  <button
                    type="button"
                    onClick={() => void runBulkAction("mark_unread")}
                    disabled={bulkSubmitting}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Marcar não lidos
                  </button>
                  <button
                    type="button"
                    onClick={() => void runBulkAction("delete")}
                    disabled={bulkSubmitting}
                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir
                  </button>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    value={bulkMoveMailbox}
                    onChange={(event) => setBulkMoveMailbox(event.target.value)}
                    className={cn(inputClass, "min-w-[240px] py-2.5")}
                  >
                    <option value="">Mover para...</option>
                    {activeMailboxes.map((mailbox) => (
                      <option key={mailbox.id} value={mailbox.email}>
                        {mailbox.label} - {mailbox.email}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void runBulkAction("move")}
                    disabled={bulkSubmitting || !bulkMoveMailbox}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", bulkSubmitting && "animate-spin")} />
                    Mover
                  </button>
                </div>
              </div>
            )}
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
              <div>
                <div className="sticky top-0 z-10 border-b border-white/10 bg-[rgba(255,252,247,0.95)] backdrop-blur">
                  <div
                    className="grid items-center gap-3 px-4 py-3 md:px-5"
                    style={{ gridTemplateColumns: listGridTemplate }}
                  >
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        ref={(element) => {
                          if (element) element.indeterminate = someVisibleSelected;
                        }}
                        onChange={(event) => toggleSelectAllVisible(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        aria-label="Selecionar mensagens visíveis"
                      />
                    </div>
                    <ResizableColumnHeader
                      label="Remetente"
                      onResizeStart={(event) => startColumnResize("sender", event)}
                    />
                    <ResizableColumnHeader
                      label="Assunto"
                      onResizeStart={(event) => startColumnResize("subject", event)}
                    />
                    {showMailboxColumn ? (
                      <ResizableColumnHeader
                        label="Caixa"
                        onResizeStart={(event) => startColumnResize("mailbox", event)}
                      />
                    ) : null}
                    <ResizableColumnHeader
                      label="Data"
                      align="right"
                      onResizeStart={(event) => startColumnResize("date", event)}
                    />
                    <div className="text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Leitura
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-white/8">
                {filteredMessages.map((message) => (
                  <MessageRow
                    key={message.id}
                    message={message}
                    active={selectedMessage?.id === message.id}
                    selected={selectedMessageIds.includes(message.id)}
                    showMailbox={showMailboxColumn}
                    gridTemplateColumns={listGridTemplate}
                    onClick={() => handleSelectMessage(message)}
                    onToggleSelect={(checked) => toggleMessageSelection(message.id, checked)}
                  />
                ))}
              </div>
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
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="max-w-md">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Operacao
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        Caixas do portal prontas para envio e recebimento
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Esta area agora fica focada apenas nas caixas. Os detalhes tecnicos seguem no sistema, mas saem da frente do cliente.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <InlineStatusTag
                        label={config.canSend ? "Envio ativo" : "Envio pendente"}
                        ok={config.canSend}
                      />
                      <InlineStatusTag
                        label={config.webhookSecretConfigured ? "Recebimento ativo" : "Recebimento pendente"}
                        ok={config.webhookSecretConfigured}
                      />
                    </div>
                  </div>
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
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                {message.direction === "inbound" ? "Recebido" : "Enviado"}
              </span>
              <MailboxPill email={message.mailboxEmail} />
            </div>

            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 md:text-[2rem]">
              {message.subject}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{formatDate(message.createdAt)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Fechar
            </button>

            {message.direction === "inbound" && (
              <button
                type="button"
                onClick={() => onReply(message)}
                className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-800 transition hover:bg-sky-100"
              >
                <Reply className="h-4 w-4" />
                Responder
              </button>
            )}

            {message.direction === "inbound" && (
              <button
                type="button"
                onClick={() => onMarkRead(message.id, !message.read)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                <CheckCheck className="h-4 w-4" />
                {message.read ? "Marcar nao lido" : "Marcar lido"}
              </button>
            )}

            <button
              type="button"
              onClick={() => onDelete(message.id)}
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              <Trash2 className="h-4 w-4" />
              Remover
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-4 py-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <MessageMetaItem
              label="De"
              value={
                message.fromName
                  ? `${message.fromName} <${message.fromEmail}>`
                  : message.fromEmail
              }
            />
            <MessageMetaItem label="Para" value={message.toEmail} />
            {message.mailboxEmail && <MessageMetaItem label="Caixa" value={message.mailboxEmail} />}
          </div>
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
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-700">
                Corpo da mensagem
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Visualizacao focada no conteudo, com leitura mais limpa.
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
              {message.direction === "inbound" ? "Inbox" : "Sent"}
            </span>
          </div>

          <div className="mt-6 whitespace-pre-wrap text-[15px] leading-8 text-slate-700">
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
  selected,
  showMailbox,
  gridTemplateColumns,
  onClick,
  onToggleSelect,
}: {
  message: AdminEmailMessage;
  active: boolean;
  selected: boolean;
  showMailbox: boolean;
  gridTemplateColumns: string;
  onClick: () => void;
  onToggleSelect: (checked: boolean) => void;
}) {
  const identity = getMessageIdentity(message);
  const unread = message.direction === "inbound" && !message.read;
  const avatarTone = getAvatarTone(identity.initial);

  return (
    <div
      className={cn(
        "transition",
        active
          ? "bg-sky-100/80 shadow-[inset_3px_0_0_rgba(14,116,144,0.95)]"
          : selected
            ? "bg-slate-100/90"
          : unread
            ? "bg-sky-50/80 hover:bg-sky-100/60"
            : "bg-transparent hover:bg-slate-50"
      )}
    >
      <div
        className="grid items-center gap-3 px-4 py-3 md:px-5"
        style={{ gridTemplateColumns }}
      >
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onToggleSelect(event.target.checked)}
            onClick={(event) => event.stopPropagation()}
            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            aria-label={`Selecionar email ${message.subject || identity.name}`}
          />
        </div>

        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold uppercase",
            avatarTone,
            unread && "ring-2 ring-sky-200/80 ring-offset-2 ring-offset-white"
          )}
        >
          {identity.initial}
        </div>

        <button type="button" onClick={onClick} className="min-w-0 text-left">
          <div className="min-w-0">
            <p
              className={cn(
                "truncate text-sm text-slate-900",
                unread ? "font-semibold" : "font-medium"
              )}
            >
              {identity.name}
            </p>
            <p className="mt-1 truncate text-xs text-slate-600">{identity.secondary}</p>
          </div>
        </button>

        <button type="button" onClick={onClick} className="min-w-0 text-left">
          <div className="min-w-0">
            <p className={cn("truncate text-sm text-slate-900", unread ? "font-semibold" : "font-medium")}>
              {message.subject || "(Sem assunto)"}
            </p>
            <p className="mt-1 truncate text-sm leading-6 text-slate-600">
              {messagePreview(message)}
            </p>
          </div>
        </button>

        {showMailbox ? (
          <button type="button" onClick={onClick} className="min-w-0 text-left">
            <div className="min-w-0">
              <MailboxPill email={message.mailboxEmail} compact />
            </div>
          </button>
        ) : null}

        <button type="button" onClick={onClick} className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            {formatListDate(message.createdAt)}
          </p>
          {message.status === "failed" ? (
            <div className="mt-1 flex justify-end">
              <StatusBadge status={message.status} compact />
            </div>
          ) : null}
        </button>

        <div className="flex justify-end">
          <ReadStateIcon message={message} compact />
        </div>
      </div>
    </div>
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700">
          {label}
        </p>
        <p className="mt-1 text-xs text-slate-600">{detail}</p>
      </div>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ResizableColumnHeader({
  label,
  align = "left",
  onResizeStart,
}: {
  label: string;
  align?: "left" | "right";
  onResizeStart: (event: React.PointerEvent<HTMLSpanElement>) => void;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500",
        align === "right" ? "justify-end pr-3 text-right" : "justify-start pr-3"
      )}
    >
      <span>{label}</span>
      <span
        role="separator"
        aria-orientation="vertical"
        onPointerDown={onResizeStart}
        className="absolute inset-y-0 right-0 flex w-3 cursor-col-resize touch-none items-center justify-center"
      >
        <span className="h-5 w-px rounded-full bg-slate-300/90" />
      </span>
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
          ? "border-sky-200 bg-sky-50 text-slate-900"
          : "border-white/10 bg-white/[0.03] text-slate-800 hover:bg-slate-50"
      )}
    >
      <span
        className={cn(
          "mt-0.5 rounded-2xl border p-2",
          active
            ? "border-sky-200 bg-sky-100 text-sky-700"
            : "border-white/10 bg-white/[0.03] text-slate-500"
        )}
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <span className="text-sm font-semibold text-slate-700">{count}</span>
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

function MessageMetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-white/60 bg-white/70 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-1.5 break-words text-sm font-medium leading-6 text-slate-900">{value}</p>
    </div>
  );
}

function MailboxPill({ email, compact = false }: { email: string | null; compact?: boolean }) {
  if (!email) {
    return (
      <span
        className={cn(
          "rounded-full border border-slate-200 bg-slate-50 font-semibold uppercase tracking-[0.16em] text-slate-600",
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
        "rounded-full border border-sky-200 bg-sky-50 font-semibold uppercase tracking-[0.16em] text-sky-800",
        compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1 text-[11px]"
      )}
    >
      {email}
    </span>
  );
}

function StatusBadge({ status, compact = false }: { status: string; compact?: boolean }) {
  const styles = {
    sent: "border-emerald-200 bg-emerald-50 text-emerald-700",
    received: "border-sky-200 bg-sky-50 text-sky-700",
    failed: "border-rose-200 bg-rose-50 text-rose-700",
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

function getAvatarTone(seed: string) {
  const normalized = seed.trim().toUpperCase() || "A";
  const index = normalized.charCodeAt(0) % avatarToneClasses.length;
  return avatarToneClasses[index];
}

function getInboxGridTemplate(widths: ColumnWidths, showMailboxColumn: boolean) {
  const columns = [
    "34px",
    "40px",
    `minmax(${minColumnWidths.sender}px, ${widths.sender}px)`,
    `minmax(${minColumnWidths.subject}px, ${widths.subject}px)`,
  ];

  if (showMailboxColumn) {
    columns.push(`minmax(${minColumnWidths.mailbox}px, ${widths.mailbox}px)`);
  }

  columns.push(`minmax(${minColumnWidths.date}px, ${widths.date}px)`, "56px");
  return columns.join(" ");
}
