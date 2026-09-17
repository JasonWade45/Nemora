"use client";

import { useEffect, useRef, useState } from "react";
import { getConversations, getMessages, sendMessage, getTeamMembers, Conversation, ChatMessage } from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [team, setTeam] = useState<Array<{ id: string; full_name: string; email: string; role: string }>>([]);
  const [activePeer, setActivePeer] = useState<string | null>(null);
  const [activePeerName, setActivePeerName] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [convos, members] = await Promise.all([
          getConversations().catch(() => []),
          getTeamMembers().catch(() => []),
        ]);
        setConversations(convos);
        setTeam(members);
      } catch {}
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!activePeer) return;
    getMessages(activePeer).then(setMessages).catch(() => setMessages([]));
  }, [activePeer]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!newMsg.trim() || !activePeer || sending) return;
    setSending(true);
    try {
      const msg = await sendMessage({ receiver_id: activePeer, content: newMsg.trim() });
      setMessages((prev) => [...prev, msg]);
      setNewMsg("");
    } catch {}
    setSending(false);
  }

  function openChat(peerId: string, peerName: string) {
    setActivePeer(peerId);
    setActivePeerName(peerName);
    setMessages([]);
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (activePeer) {
    return (
      <div className="flex flex-col h-[calc(100vh-180px)]">
        {/* Chat header */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-700 mb-3">
          <button onClick={() => setActivePeer(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <Icon d={icons.arrow_left} size={18} />
          </button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 text-white flex items-center justify-center text-xs font-bold">
            {activePeerName.charAt(0)}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">{activePeerName}</div>
            <div className="text-[10px] text-green-500">متصل</div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-2 pb-3">
          {messages.length === 0 && (
            <div className="text-center text-xs text-slate-400 mt-10">ابدأ المحادثة</div>
          )}
          {messages.map((msg) => {
            const isMe = msg.sender_id === activePeer ? false : true;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                  isMe
                    ? "bg-sky-500 text-white rounded-br-md"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-bl-md"
                }`}>
                  <div className="text-sm leading-relaxed">{msg.content}</div>
                  <div className={`text-[9px] mt-0.5 ${isMe ? "text-sky-100" : "text-slate-400"}`}>
                    {new Date(msg.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          <input
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="اكتب رسالة..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
          <button
            onClick={handleSend}
            disabled={!newMsg.trim() || sending}
            className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center disabled:opacity-50 shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">المحادثات</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{team.length} أعضاء في الفريق</p>
      </div>

      {/* Conversations */}
      {conversations.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">المحادثات الأخيرة</div>
          {conversations.map((c) => (
            <button
              key={c.peer_id || c.group_name}
              onClick={() => openChat(c.peer_id || "", c.peer_name || c.group_name || "")}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-600 transition text-right"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                {(c.peer_name || c.group_name || "?").charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{c.peer_name || c.group_name}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(c.last_message_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{c.last_message}</span>
                  {c.unread_count > 0 && (
                    <span className="w-5 h-5 rounded-full bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {c.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Team list */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">أعضاء الفريق</div>
        {team.map((t) => (
          <button
            key={t.id}
            onClick={() => openChat(t.id, t.full_name)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-600 transition text-right"
          >
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
              {t.full_name?.charAt(0) || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{t.full_name}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{t.role === "ADMIN" ? "مدير" : t.role === "MANAGER" ? "مدير فريق" : "مندوب"}</div>
            </div>
          </button>
        ))}
        {team.length === 0 && (
          <div className="text-center py-8 text-sm text-slate-400">مفيش أعضاء في الفريق</div>
        )}
      </div>
    </div>
  );
}
