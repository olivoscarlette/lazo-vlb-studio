import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare, Search, Send, RefreshCw, CheckCheck,
  Check, Clock, User, Phone, Users, Sparkles, Filter, ChevronRight,
  ShieldCheck, AlertCircle, HeartHandshake, Calendar
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
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [activeGuest, setActiveGuest] = useState<any>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

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
        if (activeConversation) {
          const updated = (data.conversations || []).find(
            (c: WhatsAppConversation) => c.phone === activeConversation.phone && c.wedding_id === activeConversation.wedding_id
          );
          if (updated) setActiveConversation(updated);
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
      }
    } catch (err) {
      console.error('Error loading chat messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [selectedWeddingId, filterType]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchConversations(true);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Select a conversation
  const handleSelectConversation = (conv: WhatsAppConversation) => {
    setActiveConversation(conv);
    fetchChatMessages(conv);
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !newMessage.trim() || sending) return;

    setSending(true);
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
          content: newMessage.trim(),
          messageType: 'text'
        })
      });

      if (res.ok) {
        setNewMessage('');
        await fetchChatMessages(activeConversation);
        await fetchConversations(true);
      } else {
        const data = await res.json();
        alert(data.error || 'Error al enviar mensaje');
      }
    } catch (err: any) {
      alert(err.message || 'Error de conexión');
    } finally {
      setSending(false);
    }
  };

  // Quick RSVP Resend button
  const handleQuickSendRSVP = async () => {
    if (!activeConversation || sending) return;
    setSending(true);
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
          content: `Confirmación oficial de asistencia para la boda de ${activeConversation.wedding_name}`,
          messageType: 'template'
        })
      });
      if (res.ok) {
        await fetchChatMessages(activeConversation);
        await fetchConversations(true);
      }
    } catch {} finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-[#FFFFFF] rounded-3xl border border-[#DDD2C4] shadow-xs overflow-hidden h-[calc(100vh-12rem)] min-h-[580px] flex flex-col">
      {/* Top Header Bar */}
      <div className="px-6 py-4 border-b border-[#DDD2C4] bg-[#F9F6F2] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
            <MessageSquare className="w-5 h-5 text-emerald-100" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-serif text-lg font-bold text-[#332C2A]">
                Centro de Mensajería WhatsApp
              </h2>
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>Meta Cloud API: Conectado</span>
              </span>
            </div>
            <p className="text-xs text-[#786C68]">
              Atiende conversaciones de confirmación vinculadas a cada boda y sus invitados.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            fetchConversations();
            if (activeConversation) fetchChatMessages(activeConversation);
          }}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#FFFFFF] hover:bg-[#EFE8DE] text-[#332C2A] border border-[#DDD2C4] transition shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#9C665C] ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Main 2-Column Split: Conversations List (Left) + Chat & Guest Details (Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Search, Filters & Conversation Cards */}
        <div className="w-full sm:w-96 md:w-[420px] border-r border-[#DDD2C4] flex flex-col bg-[#FFFFFF]">
          {/* Search Input */}
          <div className="p-3.5 border-b border-[#DDD2C4] space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#786C68]" />
              <input
                type="text"
                placeholder="Buscar por invitado, boda o teléfono..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#F9F6F2] border border-[#DDD2C4] rounded-xl text-[#332C2A] placeholder-[#786C68]/60 focus:outline-none"
              />
            </div>

            {/* Wedding Filter Dropdown */}
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <select
                  value={selectedWeddingId}
                  onChange={e => setSelectedWeddingId(e.target.value)}
                  className="w-full pl-3 pr-8 py-1.5 text-xs font-medium bg-[#FFFFFF] border border-[#DDD2C4] rounded-xl text-[#332C2A] focus:outline-none cursor-pointer truncate"
                >
                  <option value="all">Todas las Bodas VLB</option>
                  {weddings.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Status Filter Pills */}
            <div className="flex items-center space-x-1.5 pt-1">
              <button
                onClick={() => setFilterType('todas')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  filterType === 'todas'
                    ? 'bg-[#9C665C] text-white shadow-2xs'
                    : 'bg-[#F7F3EE] text-[#7D6F6B] hover:bg-[#EFE8DE] hover:text-[#332A28]'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFilterType('pendientes')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  filterType === 'pendientes'
                    ? 'bg-[#9C665C] text-white shadow-2xs'
                    : 'bg-[#F7F3EE] text-[#7D6F6B] hover:bg-[#EFE8DE] hover:text-[#332A28]'
                }`}
              >
                Pendientes
              </button>
              <button
                onClick={() => setFilterType('confirmados')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  filterType === 'confirmados'
                    ? 'bg-[#9C665C] text-white shadow-2xs'
                    : 'bg-[#F7F3EE] text-[#7D6F6B] hover:bg-[#EFE8DE] hover:text-[#332A28]'
                }`}
              >
                Confirmados
              </button>
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#EFE8DE]">
            {loading && conversations.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#786C68]">
                Cargando conversaciones...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-[#786C68] space-y-2">
                <MessageSquare className="w-8 h-8 text-[#D2C4B4] mx-auto" />
                <p className="text-xs font-medium">No hay mensajes registrados aún.</p>
                <p className="text-[11px] text-[#A89F91]">
                  Cuando envíes confirmaciones desde la lista de invitados de cualquier boda, aparecerán organizadas aquí.
                </p>
              </div>
            ) : (
              conversations.map(conv => {
                const isSelected = activeConversation?.phone === conv.phone && activeConversation?.wedding_id === conv.wedding_id;
                return (
                  <div
                    key={`${conv.wedding_id}_${conv.phone}`}
                    onClick={() => handleSelectConversation(conv)}
                    className={`p-3.5 cursor-pointer transition flex items-start space-x-3 select-none ${
                      isSelected
                        ? 'bg-[#EFE2DF]/50 border-l-4 border-l-[#9C665C]'
                        : 'hover:bg-[#F9F6F2]'
                    }`}
                  >
                    {/* Avatar Icon with WhatsApp Badge */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className="w-10 h-10 rounded-full bg-[#EFE8DE] border border-[#DDD2C4] flex items-center justify-center font-bold text-xs text-[#6E433F]">
                        {conv.guest_name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] shadow-2xs">
                        <MessageSquare className="w-2.5 h-2.5" />
                      </span>
                    </div>

                    {/* Conversation Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-xs text-[#332C2A] truncate">
                          {conv.guest_name}
                        </h4>
                        <span className="text-[10px] text-[#786C68] shrink-0 ml-2">
                          {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                        </span>
                      </div>

                      {/* Wedding Tag badge */}
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className="text-[10px] text-[#8a574e] font-semibold bg-[#EFE2DF] px-2 py-0.5 rounded-md truncate max-w-[190px]">
                          💍 {conv.wedding_name}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          conv.guest_status === 'Confirmado'
                            ? 'bg-emerald-100 text-emerald-800'
                            : conv.guest_status === 'No asistirá'
                            ? 'bg-stone-100 text-stone-600'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {conv.guest_status === 'Pendiente de confirmar' ? 'Pendiente' : conv.guest_status}
                        </span>
                      </div>

                      {/* Last Message Snippet */}
                      <p className="text-[11px] text-[#786C68] truncate mt-1">
                        {conv.last_message_direction === 'OUTBOUND' && <span className="font-medium text-[#332C2A]">Tú: </span>}
                        {conv.last_message_content || 'Invitación enviada'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Chat Messages + Guest Wedding Context */}
        <div className="flex-1 flex flex-col bg-[#FDFCFB]">
          {activeConversation ? (
            <>
              {/* Active Chat Header */}
              <div className="px-6 py-3.5 border-b border-[#DDD2C4] bg-[#FFFFFF] flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-[#EFE2DF] border border-[#DFC9C4] flex items-center justify-center font-bold text-xs text-[#6E433F]">
                    {activeConversation.guest_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-[#332C2A]">
                      {activeConversation.guest_name}
                    </h3>
                    <div className="flex items-center space-x-2 text-xs text-[#786C68]">
                      <span>{activeConversation.phone}</span>
                      <span>•</span>
                      <span className="font-medium text-[#8a574e]">{activeConversation.wedding_name}</span>
                    </div>
                  </div>
                </div>

                {/* Guest Context Details in Top Bar */}
                <div className="hidden md:flex items-center space-x-2 text-xs">
                  <span className="bg-[#F9F6F2] text-[#4A3F3C] px-3 py-1 rounded-xl border border-[#DDD2C4] font-medium">
                    Mesa: {activeConversation.table_name || 'Sin mesa'}
                  </span>
                  <span className="bg-[#F9F6F2] text-[#4A3F3C] px-3 py-1 rounded-xl border border-[#DDD2C4] font-medium">
                    Lugares: {1 + (activeConversation.companion_count || 0)}
                  </span>
                  <button
                    onClick={handleQuickSendRSVP}
                    disabled={sending}
                    className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition shadow-2xs inline-flex items-center space-x-1"
                    title="Reenviar plantilla oficial de RSVP"
                  >
                    <Send className="w-3 h-3" />
                    <span>Reenviar RSVP</span>
                  </button>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-[#F9F6F2]/40">
                {loadingMessages ? (
                  <div className="py-12 text-center text-xs text-[#786C68]">
                    Cargando historial de mensajes...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#786C68]">
                    No hay mensajes en este chat.
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
                          className={`max-w-md px-4 py-2.5 rounded-2xl shadow-2xs text-xs leading-relaxed ${
                            isOutbound
                              ? 'bg-emerald-700 text-white rounded-br-none'
                              : 'bg-[#FFFFFF] text-[#332C2A] border border-[#DDD2C4] rounded-bl-none'
                          }`}
                        >
                          {msg.message_type === 'template' && (
                            <div className="text-[10px] uppercase font-bold tracking-wider opacity-80 mb-1 flex items-center space-x-1">
                              <span>Plantilla Oficial RSVP</span>
                            </div>
                          )}
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <div
                            className={`flex items-center justify-end space-x-1 text-[9px] mt-1 ${
                              isOutbound ? 'text-emerald-200' : 'text-[#786C68]'
                            }`}
                          >
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isOutbound && (
                              <CheckCheck className="w-3 h-3 text-emerald-300" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input Footer */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-[#FFFFFF] border-t border-[#DDD2C4] flex items-center space-x-2"
              >
                <input
                  type="text"
                  placeholder={`Responder a ${activeConversation.guest_name}...`}
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="flex-1 px-4 py-2 text-xs bg-[#F9F6F2] border border-[#DDD2C4] rounded-xl text-[#332C2A] placeholder-[#786C68]/60 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="p-2.5 bg-[#9C665C] hover:bg-[#8A574E] disabled:opacity-50 text-white rounded-xl transition shadow-xs cursor-pointer"
                  title="Enviar mensaje por WhatsApp"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            /* Empty State when no conversation selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#786C68]">
              <div className="w-16 h-16 rounded-3xl bg-[#EFE8DE] flex items-center justify-center mb-4 text-[#9C665C] border border-[#DDD2C4]">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#332C2A] mb-1">
                Selecciona una conversación
              </h3>
              <p className="text-xs text-[#786C68] max-w-sm">
                Aquí aparecerán los mensajes y respuestas de los invitados identificados por cada boda de Viva La Bride Studio.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
