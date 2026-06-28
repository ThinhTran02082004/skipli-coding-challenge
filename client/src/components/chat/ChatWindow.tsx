'use client';

import React, { useEffect, useState } from 'react';
import { ChatMessage, UserRole } from '../../types';
import { getSocket } from '../../lib/socket';
import { Send, MessageSquare } from 'lucide-react';

interface ChatWindowProps {
  currentPhone: string;
  targetPhone: string;
  currentRole: UserRole;
  targetName?: string;
}

export default function ChatWindow({ currentPhone, targetPhone, currentRole, targetName }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (!currentPhone || !targetPhone) return;

    const socket = getSocket();
    socket.emit('join_room', currentPhone);
    socket.emit('get_history', { phone1: currentPhone, phone2: targetPhone });

    function handleReceive(msg: ChatMessage) {
      if (
        msg.senderPhone === targetPhone ||
        msg.receiverPhone === targetPhone ||
        msg.senderPhone === currentPhone ||
        msg.receiverPhone === currentPhone
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    }

    function handleHistory(history: ChatMessage[]) {
      setMessages(history);
    }

    socket.on('receive_message', handleReceive);
    socket.on('chat_history', handleHistory);

    return () => {
      socket.off('receive_message', handleReceive);
      socket.off('chat_history', handleHistory);
    };
  }, [currentPhone, targetPhone]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !currentPhone || !targetPhone) return;

    const socket = getSocket();
    socket.emit('send_message', {
      senderPhone: currentPhone,
      receiverPhone: targetPhone,
      senderRole: currentRole,
      text: input.trim(),
    });
    setInput('');
  }

  return (
    <div className="h-full flex flex-col bg-slate-900/30 rounded-2xl overflow-hidden border border-slate-800/80">
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center gap-3">
        <MessageSquare className="w-5 h-5 text-indigo-400" />
        <div>
          <h3 className="font-bold text-sm text-white">{targetName || targetPhone}</h3>
          <p className="text-[10px] text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Live Chat Connected
          </p>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No message history yet. Send a message to start conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderPhone === currentPhone;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[75%] p-3 rounded-2xl text-xs leading-relaxed ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-slate-800/80 bg-slate-900/60 flex gap-2">
        <input
          type="text"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl glass-input text-xs"
        />
        <button
          type="submit"
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
        >
          <Send className="w-3.5 h-3.5" /> Send
        </button>
      </form>
    </div>
  );
}
