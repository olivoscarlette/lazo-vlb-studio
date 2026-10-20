import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare, Search, Send, CheckCheck,
  Check, Clock, User, Phone, Users, Sparkles, Filter, ChevronRight,
  ShieldCheck, AlertCircle, HeartHandshake, Calendar, Copy, CheckCircle2,
  XCircle, Utensils, MapPin, Tag
} from 'lucide-react';

interface WhatsAppConversation {
  phone: string;
  wedding_id: string;
  wedding_name: string;
  guest_id: string | null;
  guest_name: string;
  guest_status: string;
  companion_count: number;
  table_name: string;
  last_message_at: string;
  last_message_content: string;
  last_message_direction: 'OUTBOUND' | 'INBOUND';
  last_message_status: string;
  total_messages: number;
  unread_count?: number;
}

interface WhatsAppMessage {
  id: string;
  wedding_id: string;
  guest_id: string | null;
  phone: string;
  direction: 'OUTBOUND' | 'INBOUND';
  message_type: 'template' | 'text';
  content: string;
  template_name?: string;
  status: string;
  created_at: string;
}

function formatWhatsAppTime(dateStr?: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Ayer';
  }
  
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

// Curated high-resolution realistic portrait avatars for contacts
const AVATAR_PORTRAITS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=160&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=160&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=160&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=160&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=160&auto=format&fit=crop&q=80'
];

function getContactAvatar(name: string, phone: string): string {
  const seed = (name || phone || 'Guest').trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
  }
  const index = Math.abs(hash) % AVATAR_PORTRAITS.length;
  return AVATAR_PORTRAITS[index];
}

export const WhatsAppHubModule: React.FC = () => {
  const { token, user } = useAuth();

  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [weddings, setWeddings] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedWeddingId, setSelectedWeddingId] = useState<string>('all');
  const [filterType, setFilterType] = useState<'todas' | 'pendientes' | 'confirmados'>('todas');
  const [search, setSearch] = useState('');

  // Selected Chat
  const [activeConversation, setActiveConversation] = useState<WhatsAppConversation | null>(null);
  const activeConvRef = useRef<WhatsAppConversation | null>(null);
  activeConvRef.current = activeConversation;

  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [activeGuest, setActiveGuest] = useState<any>(null);
  const [activeWedding, setActiveWedding] = useState<any>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Fetch Conversations List
  const fetchConversations = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const query = new URLSearchParams({
        weddingId: selectedWeddingId,
        filter: filterType,
        search: search.trim()
      });
      const res = await fetch(`/api/whatsapp/conversations?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        if (data.weddings) setWeddings(data.weddings);

        // Keep active conversation updated if it exists
        if (activeConvRef.current) {
          const updated = (data.conversations || []).find(
            (c: WhatsAppConversation) => c.phone === activeConvRef.current?.phone && c.wedding_id === activeConvRef.current?.wedding_id
          );
          if (updated) {
            setActiveConversation(prev => prev ? { ...prev, ...updated, unread_count: 0 } : null);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching WhatsApp conversations:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Fetch Messages for Selected Chat
  const fetchChatMessages = async (conv: WhatsAppConversation) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/whatsapp/conversations/${conv.wedding_id}/${encodeURIComponent(conv.phone)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setActiveGuest(data.guest || null);
        setActiveWedding(data.wedding || null);
        setTimeout(() => scrollToBottom('auto'), 80);
      }
    } catch (err) {
      console.error('Error loading chat messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Silently refresh chat messages in real time (ultra-fast, no flickering)
  const fetchChatMessagesSilently = async (conv: WhatsAppConversation) => {
    try {
      const res = await fetch(`/api/whatsapp/conversations/${conv.wedding_id}/${encodeURIComponent(conv.phone)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const newMsgs = data.messages || [];
        setMessages(prev => {
          if (newMsgs.length !== prev.length || (newMsgs.length > 0 && newMsgs[newMsgs.length - 1]?.id !== prev[prev.length - 1]?.id)) {
            setTimeout(() => scrollToBottom('smooth'), 50);
            return newMsgs;
          }
          return prev;
        });
        if (data.guest) setActiveGuest(data.guest);
        if (data.wedding) setActiveWedding(data.wedding);
      }
    } catch {
      // background polling error ignored
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [selectedWeddingId, filterType]);

  // Real-time polling: Every 1.5 seconds for instant WhatsApp synchronization without manual refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations(true);
      if (activeConvRef.current) {
        fetchChatMessagesSilently(activeConvRef.current);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [selectedWeddingId, filterType]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchConversations(true);
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  // Select a conversation
  const handleSelectConversation = (conv: WhatsAppConversation) => {
    setActiveConversation({ ...conv, unread_count: 0 });
    setConversations(prev =>
      prev.map(c =>
        c.phone === conv.phone && c.wedding_id === conv.wedding_id
          ? { ...c, unread_count: 0 }
          : c
      )
    );
    fetchChatMessages(conv);
    setSelectedTemplate(null);
    setSendError(null);
  };

  // Copy to clipboard
  const handleCopyMessage = () => {
    if (!newMessage.trim()) return;
    navigator.clipboard.writeText(newMessage.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Send message strictly via Meta WhatsApp Cloud API (with Optimistic Real-Time UI)
  const handleSendMessageMeta = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeConversation || !newMessage.trim() || sending) return;

    const trimmedContent = newMessage.trim();
    const isTemplateMsg = Boolean(selectedTemplate);
    setSending(true);
    setSendError(null);

    // Optimistic message creation: shows immediately in chat just like WhatsApp Web
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: WhatsAppMessage = {
      id: tempId,
      wedding_id: activeConversation.wedding_id,
      guest_id: activeConversation.guest_id,
      phone: activeConversation.phone,
      direction: 'OUTBOUND',
      message_type: isTemplateMsg ? 'template' : 'text',
      content: trimmedContent,
      template_name: isTemplateMsg ? `plantilla_${selectedTemplate}` : undefined,
      status: 'PENDING',
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');
    setSelectedTemplate(null);
    setTimeout(() => scrollToBottom('smooth'), 40);

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          weddingId: activeConversation.wedding_id,
          guestId: activeConversation.guest_id,
          phone: activeConversation.phone,
          content: trimmedContent,
          messageType: isTemplateMsg ? 'template' : 'text'
        })
      });

      const data = await res.json();

      if (res.ok) {
        // Update optimistic message to SENT
        setMessages(prev =>
          prev.map(m => m.id === tempId ? { ...m, id: data.messageId || m.id, status: 'SENT' } : m)
        );
        await fetchChatMessagesSilently(activeConversation);
        await fetchConversations(true);
      } else {
        setSendError(data.error || 'No se pudo enviar el mensaje por Meta Cloud API.');
        setMessages(prev =>
          prev.map(m => m.id === tempId ? { ...m, status: 'FAILED' } : m)
        );
      }
    } catch (err: any) {
      setSendError(err.message || 'Error de conexión al enviar');
      setMessages(prev =>
        prev.map(m => m.id === tempId ? { ...m, status: 'FAILED' } : m)
      );
    } finally {
      setSending(false);
    }
  };

  const handleApplyTemplate = (templateType: 1 | 2 | 3) => {
    setSelectedTemplate(templateType);
    setSendError(null);
    if (!activeConversation) return;
    const name = activeConversation.guest_name;
    const wedding = activeConversation.wedding_name;
    const seats = 1 + (activeConversation.companion_count || 0);
    const table = activeConversation.table_name || 'Mesa por asignar';

    let text = '';
    if (templateType === 1) {
      text = `¡Hola ${name}! 👋 Te recordamos que la fecha límite para confirmar tu asistencia a la boda de ${wedding} se acerca. Tienes ${seats} lugar(es) reservado(s) a tu nombre. ¿Podrás acompañarnos? Por favor confírmanos por este medio.`;
    } else if (templateType === 2) {
      const venue = activeWedding?.reception_venue || 'Fábrica La Fama';
      const dressCode = activeWedding?.dress_code || 'Rigurosa Etiqueta / Formal';
      text = `¡Hola ${name}! 📍 Te compartimos los detalles de la boda de ${wedding}: La recepción se llevará a cabo en ${venue}. Código de vestimenta: ${dressCode}. ¡Te esperamos con mucha alegría!`;
    } else if (templateType === 3) {
      text = `¡Hola ${name}! ✨ ¡Hoy es el gran día de ${wedding}! Te esperamos con mucha emoción. Tu mesa asignada es: ${table}. Al llegar, el equipo de coordinación VLB Studio te guiará a tu lugar. ¡A disfrutar!`;
    }
    setNewMessage(text);
  };

  return (
    <div className="bg-[#FFFFFF] rounded-2xl border border-[#EAE3DA] shadow-xs overflow-hidden h-[calc(100vh-8.5rem)] min-h-[640px] flex flex-col">
      {/* Sleek Minimal Header */}
      <div className="px-5 py-3 border-b border-[#EAE3DA] bg-[#FCFAF7] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center font-bold">
            <MessageSquare className="w-4 h-4 text-[#25D366]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-serif text-lg font-bold text-[#332A28]">
                WhatsApp Hub
              </h2>
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#E4ECE5] text-[#2B5235] border border-[#BDD4C1]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse" />
                <span>Meta API Conectada</span>
              </span>
            </div>
            <p className="text-[11px] text-[#7D6F6B]">
              Línea Oficial: <span className="font-mono font-semibold text-[#332A28]">+52 81 2866 3440</span> (Viva la Bride)
            </p>
          </div>
        </div>

        {/* Real-Time Live Status Indicator */}
        <div className="hidden sm:flex items-center space-x-2 text-[11px] text-[#7D6F6B]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Sincronizado en tiempo real</span>
        </div>
      </div>

      {/* Main 2-Column Split: Conversations List (Left) + Chat Stream & Composer (Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Search, Filters & Contact Avatars List */}
        <div className="w-full sm:w-88 md:w-[360px] lg:w-[390px] border-r border-[#EAE3DA] flex flex-col bg-[#FFFFFF]">
          {/* Search Bar & Wedding Filter */}
          <div className="p-3 border-b border-[#EAE3DA] space-y-2 bg-[#FAF8F5]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7D6F6B]" />
              <input
                type="text"
                placeholder="Buscar por nombre, boda o teléfono..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#FFFFFF] border border-[#EAE3DA] rounded-xl text-[#332A28] placeholder:text-[#7D6F6B]/60 focus:outline-none focus:border-[#9C665C]"
              />
            </div>

            {/* Wedding Dropdown */}
            <select
              value={selectedWeddingId}
              onChange={e => setSelectedWeddingId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-semibold bg-[#FFFFFF] border border-[#EAE3DA] rounded-xl text-[#332A28] focus:outline-none focus:border-[#9C665C] cursor-pointer truncate"
            >
              <option value="all">💍 Todas las Bodas VLB</option>
              {weddings.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>

            {/* Filter Pills */}
            <div className="flex items-center space-x-1 pt-0.5">
              <button
                type="button"
                onClick={() => setFilterType('todas')}
                className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition ${
                  filterType === 'todas'
                    ? 'bg-[#9C665C] text-white shadow-2xs'
                    : 'bg-[#FFFFFF] text-[#7D6F6B] hover:bg-[#F3ECE2] border border-[#EAE3DA]'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setFilterType('pendientes')}
                className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition ${
                  filterType === 'pendientes'
                    ? 'bg-[#9C665C] text-white shadow-2xs'
                    : 'bg-[#FFFFFF] text-[#7D6F6B] hover:bg-[#F3ECE2] border border-[#EAE3DA]'
                }`}
              >
                Pendientes
              </button>
              <button
                type="button"
                onClick={() => setFilterType('confirmados')}
                className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition ${
                  filterType === 'confirmados'
                    ? 'bg-[#9C665C] text-white shadow-2xs'
                    : 'bg-[#FFFFFF] text-[#7D6F6B] hover:bg-[#F3ECE2] border border-[#EAE3DA]'
                }`}
              >
                Confirmados
              </button>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#F7F3EE]">
            {loading && conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#7D6F6B]">
                Cargando conversaciones...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#7D6F6B]">
                No se encontraron conversaciones.
              </div>
            ) : (
              conversations.map(conv => {
                const isSelected =
                  activeConversation?.phone === conv.phone &&
                  activeConversation?.wedding_id === conv.wedding_id;
                const avatarUrl = getContactAvatar(conv.guest_name, conv.phone);

                return (
                  <div
                    key={`${conv.wedding_id}_${conv.phone}`}
                    onClick={() => handleSelectConversation(conv)}
                    className={`p-3 cursor-pointer transition flex items-center space-x-3 select-none ${
                      isSelected
                        ? 'bg-[#FDF6F5] border-l-4 border-l-[#9C665C]'
                        : 'hover:bg-[#FCFAF7]'
                    }`}
                  >
                    {/* Guest Profile Image like WhatsApp */}
                    <div className="relative shrink-0">
                      <img
                        src={avatarUrl}
                        alt={conv.guest_name}
                        className="w-11 h-11 rounded-full object-cover border border-[#EAE3DA] shadow-2xs"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden w-11 h-11 rounded-full bg-[#FAF3E8] text-[#9C665C] font-bold text-xs flex items-center justify-center border border-[#EAE3DA]">
                        {conv.guest_name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#25D366] border-2 border-white" />
                    </div>

                    {/* Conversation Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-xs truncate ${
                          (conv.unread_count || 0) > 0 ? 'font-bold text-[#111B21]' : 'font-semibold text-[#332A28]'
                        }`}>
                          {conv.guest_name}
                        </h4>
                        <span className={`text-[10px] shrink-0 ml-1.5 font-medium ${
                          (conv.unread_count || 0) > 0 ? 'text-[#25D366] font-bold' : 'text-[#7D6F6B]'
                        }`}>
                          {formatWhatsAppTime(conv.last_message_at)}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1 text-[11px] text-[#7D6F6B] truncate mt-0.5">
                        {conv.last_message_direction === 'OUTBOUND' && (
                          <CheckCheck className="w-3.5 h-3.5 shrink-0 text-[#9C665C]" />
                        )}
                        <span className="truncate">{conv.last_message_content || 'Sin mensajes'}</span>
                      </div>

                      <div className="flex items-center justify-between gap-1 mt-1">
                        <span className="text-[10px] text-[#9C665C] font-medium truncate max-w-[150px]">
                          💍 {conv.wedding_name}
                        </span>
                        <div className="flex items-center space-x-1 shrink-0">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                            conv.guest_status === 'Confirmado'
                              ? 'bg-[#E4ECE5] text-[#2B5235]'
                              : conv.guest_status === 'No asistirá'
                              ? 'bg-[#FDF6F5] text-[#9C665C]'
                              : 'bg-[#FAF3E8] text-[#7C5824]'
                          }`}>
                            {conv.guest_status === 'Pendiente de confirmar' ? 'Pendiente' : conv.guest_status}
                          </span>
                          {(conv.unread_count || 0) > 0 && (
                            <span className="w-4 h-4 rounded-full bg-[#25D366] text-white text-[10px] font-bold flex items-center justify-center">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Chat Messages + Guest Context + Composer */}
        <div className="flex-1 flex flex-col bg-[#FAF8F5]">
          {activeConversation ? (
            <>
              {/* Active Chat Header */}
              <div className="px-5 py-3 border-b border-[#EAE3DA] bg-[#FFFFFF] flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative shrink-0">
                    <img
                      src={getContactAvatar(activeConversation.guest_name, activeConversation.phone)}
                      alt={activeConversation.guest_name}
                      className="w-10 h-10 rounded-full object-cover border border-[#EAE3DA]"
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#25D366] border-2 border-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[#332A28]">
                      {activeConversation.guest_name}
                    </h3>
                    <div className="flex items-center space-x-2 text-[11px] text-[#7D6F6B]">
                      <span className="text-[#25D366] font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" /> En línea
                      </span>
                      <span>•</span>
                      <span className="font-mono">{activeConversation.phone}</span>
                      <span>•</span>
                      <span className="font-semibold text-[#9C665C]">{activeConversation.wedding_name}</span>
                    </div>
                  </div>
                </div>

                {/* Guest Context Details in Top Bar */}
                <div className="flex items-center space-x-2 text-xs">
                  <span className="bg-[#FAF8F5] text-[#332A28] px-2.5 py-1 rounded-lg border border-[#EAE3DA] font-medium text-[11px] flex items-center gap-1">
                    <Utensils className="w-3 h-3 text-[#9C665C]" />
                    <span>Mesa: {activeConversation.table_name || 'Sin mesa'}</span>
                  </span>
                  <span className="bg-[#FAF8F5] text-[#332A28] px-2.5 py-1 rounded-lg border border-[#EAE3DA] font-medium text-[11px] flex items-center gap-1">
                    <Users className="w-3 h-3 text-[#9C665C]" />
                    <span>Pases: {1 + (activeConversation.companion_count || 0)}</span>
                  </span>
                </div>
              </div>

              {/* Chat Messages Body with Luxury Background */}
              <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-[#FAF8F5]">
                {loadingMessages ? (
                  <div className="py-12 text-center text-xs text-[#7D6F6B]">
                    Cargando historial de mensajes...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#7D6F6B]">
                    No hay mensajes previos en este chat. Escribe un mensaje abajo para iniciar la conversación oficial.
                  </div>
                ) : (
                  messages.map(msg => {
                    const isOutbound = msg.direction === 'OUTBOUND';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-md px-4 py-3 rounded-2xl shadow-xs text-xs leading-relaxed ${
                            isOutbound
                              ? 'bg-[#9C665C] text-white rounded-br-xs'
                              : 'bg-[#FFFFFF] text-[#332A28] border border-[#EAE3DA] rounded-bl-xs'
                          }`}
                        >
                          {msg.message_type === 'template' ? (
                            <div className="space-y-2">
                              <div className="text-[10px] uppercase font-bold tracking-wider text-rose-200 flex items-center space-x-1 pb-1 border-b border-white/20">
                                <span>Invitación Oficial RSVP 💍</span>
                              </div>
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                              <div className="pt-2 flex items-center gap-1.5 border-t border-white/20">
                                <span className="px-2 py-1 bg-white/20 rounded-md text-[10px] font-semibold">
                                  ✓ Confirmo asistencia
                                </span>
                                <span className="px-2 py-1 bg-white/20 rounded-md text-[10px] font-semibold">
                                  ✕ No podré asistir
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          )}

                          <div
                            className={`flex items-center justify-end space-x-1 text-[10px] mt-1.5 ${
                              isOutbound ? 'text-white/80' : 'text-[#7D6F6B]'
                            }`}
                          >
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isOutbound && (
                              msg.status === 'PENDING' ? (
                                <Clock className="w-3 h-3 text-white/60 animate-spin" />
                              ) : msg.status === 'FAILED' ? (
                                <span className="text-rose-200 font-bold">!</span>
                              ) : (
                                <CheckCheck className="w-3.5 h-3.5 text-white" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Error Toast if Meta rejects */}
              {sendError && (
                <div className="mx-4 my-2 px-3.5 py-2 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
                  <span>{sendError}</span>
                  <button
                    type="button"
                    onClick={() => setSendError(null)}
                    className="font-bold ml-2 text-rose-900 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Quick Template Buttons Bar */}
              <div className="px-4 py-2 bg-[#FFFFFF] border-t border-[#EAE3DA] flex items-center gap-2 overflow-x-auto">
                <span className="text-[11px] font-bold text-[#7D6F6B] uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#9C665C]" />
                  <span>Plantillas:</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate(1)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap transition cursor-pointer shadow-2xs ${
                    selectedTemplate === 1
                      ? 'bg-[#9C665C] text-white border-[#9C665C]'
                      : 'bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#332A28] border-[#EAE3DA]'
                  }`}
                  title="Cargar recordatorio RSVP y acompañantes"
                >
                  ⚡ 1. Recordatorio RSVP
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate(2)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap transition cursor-pointer shadow-2xs ${
                    selectedTemplate === 2
                      ? 'bg-[#9C665C] text-white border-[#9C665C]'
                      : 'bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#332A28] border-[#EAE3DA]'
                  }`}
                  title="Cargar ubicación, dress code y horarios"
                >
                  📍 2. Ubicación & Dress Code
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate(3)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap transition cursor-pointer shadow-2xs ${
                    selectedTemplate === 3
                      ? 'bg-[#9C665C] text-white border-[#9C665C]'
                      : 'bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#332A28] border-[#EAE3DA]'
                  }`}
                  title="Cargar asignación de mesa para el Día Boda"
                >
                  🍽️ 3. Mesa Día Boda
                </button>
              </div>

              {/* Floating-style Message Composer */}
              <div className="p-3.5 bg-[#FFFFFF] border-t border-[#EAE3DA]">
                <div className="flex items-end space-x-2">
                  <textarea
                    rows={2}
                    placeholder={`Escribe un mensaje para ${activeConversation.guest_name}... (Presiona Enter para enviar)`}
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessageMeta();
                      }
                    }}
                    className="flex-1 px-3.5 py-2 text-xs bg-[#FAF8F5] border border-[#EAE3DA] rounded-xl text-[#332A28] placeholder:text-[#7D6F6B]/60 focus:outline-none focus:border-[#9C665C] leading-relaxed resize-none"
                  />

                  {/* Send Button: strictly through Meta Cloud API */}
                  <button
                    type="button"
                    onClick={() => handleSendMessageMeta()}
                    disabled={sending || !newMessage.trim()}
                    className="px-4 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-40 flex items-center space-x-1.5 shrink-0"
                    title="Enviar mensaje por WhatsApp Meta API (Enter)"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sending ? '...' : 'Enviar'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#7D6F6B] mt-1.5 px-1">
                  <span>Presiona <strong>Enter</strong> para enviar, <strong>Shift + Enter</strong> para salto de línea</span>
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    disabled={!newMessage.trim()}
                    className="text-[#9C665C] hover:underline cursor-pointer disabled:opacity-30"
                  >
                    {copied ? '¡Copiado! ✓' : 'Copiar borrador'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#7D6F6B]">
              <div className="w-14 h-14 rounded-2xl bg-[#FAF8F5] flex items-center justify-center mb-3 text-[#9C665C] border border-[#EAE3DA]">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#332A28] mb-1">
                Selecciona una conversación
              </h3>
              <p className="text-xs text-[#7D6F6B] max-w-xs leading-relaxed">
                Mensajería oficial en tiempo real de Viva la Bride Studio conectada directamente con WhatsApp Business.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
