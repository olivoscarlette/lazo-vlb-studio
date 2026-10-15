import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare, Search, Send, RefreshCw, CheckCheck,
  Check, Clock, User, Phone, Users, Sparkles, Filter, ChevronRight,
  ShieldCheck, AlertCircle, HeartHandshake, Calendar, Copy, ExternalLink
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
  const [activeWedding, setActiveWedding] = useState<any>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);

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
        setActiveWedding(data.wedding || null);
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
  };

  const getCleanPhone = (phone?: string) => {
    if (!phone) return '';
    return phone.replace(/[^0-9]/g, '');
  };

  // 1-Click WhatsApp Direct (wa.me) - Bulletproof, works without Meta approval!
  const handleOpenDirectWhatsApp = async () => {
    if (!activeConversation || !newMessage.trim()) return;
    const cleanPhone = getCleanPhone(activeConversation.phone);
    if (!cleanPhone) {
      alert('Este contacto no tiene un teléfono válido.');
      return;
    }

    const encodedText = encodeURIComponent(newMessage.trim());
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

    // Open WhatsApp Web or Mobile App directly
    window.open(waUrl, '_blank');

    // Log the message in LAZO database so the conversation is saved
    try {
      await fetch('/api/whatsapp/log-direct', {
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
          templateType: selectedTemplate ? `plantilla_${selectedTemplate}` : 'mensaje_directo'
        })
      });
      await fetchChatMessages(activeConversation);
      await fetchConversations(true);
    } catch (err) {
      console.error('Error logging direct WhatsApp message:', err);
    }
  };

  // Copy to clipboard
  const handleCopyMessage = () => {
    if (!newMessage.trim()) return;
    navigator.clipboard.writeText(newMessage.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Send message via Meta Cloud API (official template delivery)
  const handleSendMessageMeta = async (e: React.FormEvent) => {
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
          messageType: selectedTemplate ? 'template' : 'text'
        })
      });

      if (res.ok) {
        setNewMessage('');
        setSelectedTemplate(null);
        await fetchChatMessages(activeConversation);
        await fetchConversations(true);
      } else {
        const data = await res.json();
        // Friendly fallback message if Meta rejects or is pending
        if (confirm(`La API de Meta Cloud reportó: "${data.error || 'Plantilla no aprobada'}".\n\n¿Deseas enviar el mensaje directamente mediante WhatsApp Web / App (wa.me) sin depender de Meta?`)) {
          handleOpenDirectWhatsApp();
        }
      }
    } catch (err: any) {
      alert(err.message || 'Error de conexión');
    } finally {
      setSending(false);
    }
  };

  const handleApplyTemplate = (templateType: 1 | 2 | 3) => {
    if (!activeConversation) return;
    setSelectedTemplate(templateType);
    const name = activeConversation.guest_name || 'Invitado';
    const wedding = activeConversation.wedding_name || 'los novios';
    const seats = 1 + (activeConversation.companion_count || 0);
    const table = activeConversation.table_name || 'Pendiente de asignar';

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
    <div className="bg-[#FFFFFF] rounded-3xl border border-[#EAE3DA] shadow-xs overflow-hidden h-[calc(100vh-10rem)] min-h-[620px] flex flex-col">
      {/* Top Header Bar */}
      <div className="px-6 py-4 border-b border-[#EAE3DA] bg-[#FAF8F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#E4ECE5] text-[#2B5235] border border-[#BDD4C1] flex items-center justify-center shadow-xs">
            <MessageSquare className="w-5 h-5 text-[#2B5235]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-serif text-2xl font-bold text-[#2B2826]">
                Centro de Mensajería WhatsApp
              </h2>
              <span className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#E4ECE5] text-[#2B5235] border border-[#BDD4C1]">
                <span className="w-2 h-2 rounded-full bg-[#2B5235]" />
                <span>WhatsApp Directo (wa.me) 100% Activo</span>
              </span>
            </div>
            <p className="text-sm text-[#8A7E72] mt-0.5">
              Envío directo sin bloqueos de Meta ni plantillas pendientes, con respaldo de historial por boda.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            fetchConversations();
            if (activeConversation) fetchChatMessages(activeConversation);
          }}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#FFFFFF] hover:bg-[#FAF8F5] text-[#2B2826] border border-[#EAE3DA] transition shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#9C665C] ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Main 2-Column Split: Conversations List (Left) + Chat & Guest Details (Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Search, Filters & Conversation Cards */}
        <div className="w-full sm:w-96 md:w-[400px] border-r border-[#EAE3DA] flex flex-col bg-[#FFFFFF]">
          {/* Search & Filter Header */}
          <div className="p-3.5 border-b border-[#EAE3DA] space-y-2.5 bg-[#FCFAF7]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A7E72]" />
              <input
                type="text"
                placeholder="Buscar por invitado, boda o teléfono..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#FFFFFF] border border-[#EAE3DA] rounded-xl text-[#2B2826] placeholder:text-[#8A7E72]/60 focus:outline-none focus:ring-2 focus:ring-[#9C665C]"
              />
            </div>

            {/* Wedding Filter Dropdown */}
            <div className="relative">
              <select
                value={selectedWeddingId}
                onChange={e => setSelectedWeddingId(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 text-xs font-semibold bg-[#FFFFFF] border border-[#EAE3DA] rounded-xl text-[#2B2826] focus:outline-none cursor-pointer truncate"
              >
                <option value="all">Todas las Bodas VLB</option>
                {weddings.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            {/* Quick Status Filter Pills */}
            <div className="flex items-center space-x-1.5 pt-0.5">
              <button
                onClick={() => setFilterType('todas')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  filterType === 'todas'
                    ? 'bg-[#9C665C] text-white shadow-xs'
                    : 'bg-[#FAF8F5] text-[#5A524C] hover:bg-[#F3ECE2] border border-[#EAE3DA]'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFilterType('pendientes')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  filterType === 'pendientes'
                    ? 'bg-[#9C665C] text-white shadow-xs'
                    : 'bg-[#FAF8F5] text-[#5A524C] hover:bg-[#F3ECE2] border border-[#EAE3DA]'
                }`}
              >
                Pendientes
              </button>
              <button
                onClick={() => setFilterType('confirmados')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  filterType === 'confirmados'
                    ? 'bg-[#9C665C] text-white shadow-xs'
                    : 'bg-[#FAF8F5] text-[#5A524C] hover:bg-[#F3ECE2] border border-[#EAE3DA]'
                }`}
              >
                Confirmados
              </button>
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#FAF8F5]">
            {loading && conversations.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#8A7E72]">
                Cargando conversaciones...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-[#8A7E72] space-y-2">
                <MessageSquare className="w-8 h-8 text-[#EAE3DA] mx-auto" />
                <p className="text-sm font-semibold text-[#2B2826]">No hay conversaciones registradas.</p>
                <p className="text-xs text-[#8A7E72] leading-relaxed">
                  Las confirmaciones y mensajes enviados a los invitados de las bodas aparecerán organizados aquí.
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
                        ? 'bg-[#FDF6F5] border-l-4 border-l-[#9C665C]'
                        : 'hover:bg-[#FCFAF7]'
                    }`}
                  >
                    {/* Avatar Icon */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className="w-10 h-10 rounded-full bg-[#FAF8F5] border border-[#EAE3DA] flex items-center justify-center font-bold text-xs text-[#9C665C]">
                        {conv.guest_name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#2B5235] text-white flex items-center justify-center text-[9px] shadow-xs">
                        <MessageSquare className="w-2.5 h-2.5" />
                      </span>
                    </div>

                    {/* Conversation Info */}
                    <div className="flex-1 min-w-0">
                      {/* Top Row: Name & Timestamp */}
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm truncate ${(conv.unread_count || 0) > 0 ? 'font-bold text-[#111B21]' : 'font-semibold text-[#2B2826]'}`}>
                          {conv.guest_name}
                        </h4>
                        <span className={`text-[11px] shrink-0 ml-2 font-medium ${(conv.unread_count || 0) > 0 ? 'text-[#25D366] font-bold' : 'text-[#667781]'}`}>
                          {formatWhatsAppTime(conv.last_message_at)}
                        </span>
                      </div>

                      {/* Middle Row: Wedding Tag badge */}
                      <div className="flex items-center space-x-1.5 mt-1">
                        <span className="text-[11px] text-[#9C665C] font-semibold bg-[#FDF6F5] border border-[#F3DCD7] px-2 py-0.5 rounded-md truncate max-w-[150px]">
                          💍 {conv.wedding_name}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                          conv.guest_status === 'Confirmado'
                            ? 'bg-[#E4ECE5] text-[#2B5235] border border-[#BDD4C1]'
                            : conv.guest_status === 'No asistirá'
                            ? 'bg-[#FDF6F5] text-[#9C665C] border border-[#F3DCD7]'
                            : 'bg-[#FAF3E8] text-[#7C5824] border border-[#E8D7B8]'
                        }`}>
                          {conv.guest_status === 'Pendiente de confirmar' ? 'Pendiente' : conv.guest_status}
                        </span>
                      </div>

                      {/* Bottom Row: Last Message Snippet + WhatsApp Green Unread Badge */}
                      <div className="flex items-center justify-between mt-1.5 gap-2">
                        <p className={`text-xs truncate flex items-center space-x-1 ${(conv.unread_count || 0) > 0 ? 'text-[#111B21] font-semibold' : 'text-[#667781]'}`}>
                          {conv.last_message_direction === 'OUTBOUND' && (
                            <span className="inline-flex shrink-0 mr-1">
                              {conv.last_message_status === 'READ' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB]" />
                              ) : conv.last_message_status === 'DELIVERED' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-[#8696A0]" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-[#8696A0]" />
                              )}
                            </span>
                          )}
                          <span className="truncate">{conv.last_message_content || 'Invitación enviada'}</span>
                        </p>

                        {/* Circular WhatsApp Green Badge */}
                        {(conv.unread_count || 0) > 0 && (
                          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#25D366] text-white text-[11px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Chat Messages + Guest Context + Composer */}
        <div className="flex-1 flex flex-col bg-[#FCFAF7]">
          {activeConversation ? (
            <>
              {/* Active Chat Header */}
              <div className="px-6 py-3.5 border-b border-[#EAE3DA] bg-[#FFFFFF] flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-[#FDF6F5] border border-[#F3DCD7] flex items-center justify-center font-bold text-xs text-[#9C665C]">
                    {activeConversation.guest_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#2B2826]">
                      {activeConversation.guest_name}
                    </h3>
                    <div className="flex items-center space-x-2 text-xs text-[#8A7E72]">
                      <span className="font-mono">{activeConversation.phone}</span>
                      <span>•</span>
                      <span className="font-semibold text-[#9C665C]">{activeConversation.wedding_name}</span>
                    </div>
                  </div>
                </div>

                {/* Guest Context Details in Top Bar */}
                <div className="flex items-center space-x-2 text-xs">
                  <span className="bg-[#FAF8F5] text-[#5A524C] px-3 py-1.5 rounded-xl border border-[#EAE3DA] font-semibold">
                    Mesa: {activeConversation.table_name || 'Sin mesa'}
                  </span>
                  <span className="bg-[#FAF8F5] text-[#5A524C] px-3 py-1.5 rounded-xl border border-[#EAE3DA] font-semibold">
                    Pases: {1 + (activeConversation.companion_count || 0)}
                  </span>
                  <a
                    href={`https://wa.me/${getCleanPhone(activeConversation.phone)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 bg-[#E4ECE5] hover:bg-[#D5E3D7] text-[#2B5235] font-semibold rounded-xl text-xs transition border border-[#BDD4C1] inline-flex items-center space-x-1.5 shadow-xs"
                    title="Abrir chat en WhatsApp"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-[#FAF8F5]/50">
                {loadingMessages ? (
                  <div className="py-12 text-center text-sm text-[#8A7E72]">
                    Cargando historial de mensajes...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-sm text-[#8A7E72]">
                    No hay mensajes previos en este chat. Usa las plantillas de abajo para iniciar la conversación.
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
                          className={`max-w-lg px-4 py-3 rounded-2xl shadow-xs text-sm leading-relaxed ${
                            isOutbound
                              ? 'bg-[#E4ECE5] text-[#2B5235] border border-[#BDD4C1] rounded-br-none'
                              : 'bg-[#FFFFFF] text-[#2B2826] border border-[#EAE3DA] rounded-bl-none'
                          }`}
                        >
                          {msg.message_type === 'template' && (
                            <div className="text-[11px] uppercase font-bold tracking-wider text-[#9C665C] mb-1 flex items-center space-x-1">
                              <span>Plantilla Oficial RSVP</span>
                            </div>
                          )}
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <div
                            className={`flex items-center justify-end space-x-1 text-[11px] mt-1.5 ${
                              isOutbound ? 'text-[#2B5235]/70' : 'text-[#8A7E72]'
                            }`}
                          >
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isOutbound && (
                              <CheckCheck className="w-3.5 h-3.5 text-[#2B5235]" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Template Buttons Bar */}
              <div className="px-5 py-2.5 bg-[#FFFFFF] border-t border-[#EAE3DA] flex items-center gap-2 overflow-x-auto">
                <span className="text-xs font-bold text-[#8A7E72] uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#9C665C]" />
                  <span>Plantillas rápidas:</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate(1)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition cursor-pointer shadow-2xs ${
                    selectedTemplate === 1
                      ? 'bg-[#9C665C] text-white border-[#9C665C]'
                      : 'bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#2B2826] border-[#EAE3DA]'
                  }`}
                  title="Cargar recordatorio RSVP y acompañantes"
                >
                  ⚡ 1. Recordatorio RSVP
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate(2)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition cursor-pointer shadow-2xs ${
                    selectedTemplate === 2
                      ? 'bg-[#9C665C] text-white border-[#9C665C]'
                      : 'bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#2B2826] border-[#EAE3DA]'
                  }`}
                  title="Cargar ubicación, dress code y horarios"
                >
                  📍 2. Ubicación & Dress Code
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate(3)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition cursor-pointer shadow-2xs ${
                    selectedTemplate === 3
                      ? 'bg-[#9C665C] text-white border-[#9C665C]'
                      : 'bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#2B2826] border-[#EAE3DA]'
                  }`}
                  title="Cargar asignación de mesa para el Día Boda"
                >
                  🍽️ 3. Mesa Día Boda
                </button>
              </div>

              {/* Message Composer Footer */}
              <div className="p-4 bg-[#FFFFFF] border-t border-[#EAE3DA] space-y-3">
                <textarea
                  rows={3}
                  placeholder={`Escribe o edita el mensaje para ${activeConversation.guest_name}...`}
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#EAE3DA] rounded-2xl text-[#2B2826] placeholder:text-[#8A7E72]/60 focus:outline-none focus:ring-2 focus:ring-[#9C665C] leading-relaxed resize-none"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleCopyMessage}
                      disabled={!newMessage.trim()}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#FAF8F5] hover:bg-[#F3ECE2] text-[#2B2826] border border-[#EAE3DA] transition cursor-pointer disabled:opacity-50"
                      title="Copiar texto al portapapeles"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#8A7E72]" />
                      <span>{copied ? '¡Copiado! ✓' : 'Copiar Texto'}</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-2.5">
                    {/* Botón Principal: Abrir en WhatsApp (wa.me) sin depender de Meta */}
                    <button
                      type="button"
                      onClick={handleOpenDirectWhatsApp}
                      disabled={!newMessage.trim()}
                      className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#E4ECE5] hover:bg-[#D5E3D7] text-[#2B5235] text-xs font-bold uppercase tracking-wider rounded-xl border border-[#BDD4C1] transition shadow-xs cursor-pointer disabled:opacity-50"
                      title="Abrir en WhatsApp Web o App con mensaje prellenado"
                    >
                      <MessageSquare className="w-4 h-4 text-[#2B5235]" />
                      <span>Abrir en WhatsApp (wa.me)</span>
                    </button>

                    {/* Botón Secundario: Enviar vía Meta Cloud API */}
                    <button
                      type="button"
                      onClick={handleSendMessageMeta}
                      disabled={sending || !newMessage.trim()}
                      className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-[#9C665C] hover:bg-[#8A574E] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                      title="Enviar mediante plantilla oficial de Meta API"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{sending ? 'Enviando...' : 'Meta API'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Empty State when no conversation selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#8A7E72]">
              <div className="w-16 h-16 rounded-3xl bg-[#FAF8F5] flex items-center justify-center mb-4 text-[#9C665C] border border-[#EAE3DA]">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#2B2826] mb-1">
                Selecciona una conversación
              </h3>
              <p className="text-sm text-[#8A7E72] max-w-sm leading-relaxed">
                Aquí aparecerán las confirmaciones y respuestas de los invitados de Viva La Bride Studio para enviar recordatorios y detalles en 1 clic.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
