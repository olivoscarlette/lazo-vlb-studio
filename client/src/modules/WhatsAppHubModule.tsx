import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare, Search, Send, CheckCheck,
  Check, Clock, User, Phone, Users, Sparkles, Filter, ChevronRight,
  ShieldCheck, AlertCircle, HeartHandshake, Calendar, Copy, CheckCircle2,
  XCircle, Utensils, MapPin, Tag, FileText
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

// Luxury brand color palettes for guest avatars
const AVATAR_PALETTES = [
  { bg: 'bg-[#FDF0ED]', text: 'text-[#9C665C]', border: 'border-[#F3DCD7]' }, // Terracotta Rose
  { bg: 'bg-[#FAF3E8]', text: 'text-[#8A6332]', border: 'border-[#EBDCC5]' }, // Warm Champagne / Gold
  { bg: 'bg-[#EBF2ED]', text: 'text-[#3E6548]', border: 'border-[#D2E2D6]' }, // Sage Olive
  { bg: 'bg-[#F2EEF5]', text: 'text-[#6A5378]', border: 'border-[#DFD6E5]' }, // Soft Mauve
  { bg: 'bg-[#F5ECE9]', text: 'text-[#8A574E]', border: 'border-[#E8D2CC]' }, // Warm Blush
  { bg: 'bg-[#F7F3EE]', text: 'text-[#5C504A]', border: 'border-[#E5DDD4]' }  // Alabaster Taupe
];

function getInitials(name?: string, phone?: string): string {
  if (!name || name === phone) {
    const clean = (phone || '').replace(/\D/g, '');
    return clean.slice(-2) || 'WA';
  }
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0]?.slice(0, 2).toUpperCase() || 'W';
}

function getAvatarPalette(name?: string, phone?: string) {
  const seed = (name || phone || 'Guest').trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

function formatWeddingDateHuman(dateStr?: string | null): string {
  if (!dateStr) return 'la fecha del evento';
  const trimmed = dateStr.trim();
  if (trimmed.includes('de ') || trimmed.includes('De ')) return trimmed;

  try {
    const raw = trimmed.split('T')[0];
    const parts = raw.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      const months = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      const d = new Date(year, month - 1, day);
      const daysOfWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      const dayName = daysOfWeek[d.getDay()];
      const monthName = months[month - 1];

      return `${dayName} ${day} de ${monthName}`;
    }
  } catch {}

  return trimmed;
}

function formatCoupleNames(partner1?: string, partner2?: string, weddingName?: string): string {
  if (partner1 && partner2) {
    const p1 = partner1.trim();
    const p2 = partner2.trim();
    const connector = p2.toLowerCase().startsWith('i') || p2.toLowerCase().startsWith('hi') ? 'e' : 'y';
    return `${p1} ${connector} ${p2}`;
  }
  if (weddingName) {
    let cleaned = weddingName.replace(/^Boda\s+(de\s+)?(los\s+)?/i, '').trim();
    cleaned = cleaned.replace(/\s+&\s+/g, ' y ');
    return cleaned;
  }
  return 'los novios';
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

  // Fallback: Send message directly through wa.me (opens WhatsApp Web/App with prefilled text & logs to DB)
  const handleSendDirectWaMe = async (textToSend: string) => {
    if (!activeConversation || !textToSend.trim()) return;
    let cleanPhone = activeConversation.phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) cleanPhone = '52' + cleanPhone;
    if (cleanPhone.length === 13 && cleanPhone.startsWith('521')) cleanPhone = '52' + cleanPhone.slice(3);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textToSend.trim())}`;
    
    window.open(waUrl, '_blank');

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
          content: textToSend.trim(),
          templateType: 'direct_wa_me'
        })
      });
      setNewMessage('');
      setSendError(null);
      await fetchChatMessagesSilently(activeConversation);
      await fetchConversations(true);
    } catch {}
  };

  // Send message strictly via Meta WhatsApp Cloud API (with Optimistic Real-Time UI)
  const handleSendMessageMeta = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeConversation || !newMessage.trim() || sending) return;

    const trimmedContent = newMessage.trim();
    // Only send as official template if template 1 is active AND the content hasn't been replaced by custom chat text
    const isOfficialTemplate = selectedTemplate === 1 && trimmedContent.includes('Nos llena de ilusión invitarte');
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
      message_type: isOfficialTemplate ? 'template' : 'text',
      content: trimmedContent,
      template_name: isOfficialTemplate ? 'rsvp_viva_la_bride' : undefined,
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
          messageType: isOfficialTemplate ? 'template' : 'text'
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

  const handleSendInvitationMeta = async () => {
    if (!activeConversation || !token || sending) return;
    setSending(true);
    setSendError(null);
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
          content: 'Invitación oficial',
          messageType: 'invitation'
        })
      });
      const data = await res.json();
      if (res.ok) {
        await fetchChatMessages(activeConversation);
        fetchConversations(true);
      } else {
        setSendError(data.error || 'Error al enviar la invitación');
      }
    } catch (err: any) {
      setSendError(err.message || 'Error de conexión');
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
    const dateFormatted = formatWeddingDateHuman(activeWedding?.wedding_date || activeWedding?.date);
    const coupleClean = formatCoupleNames(activeWedding?.partner_1_name, activeWedding?.partner_2_name, wedding);

    let text = '';
    if (templateType === 1) {
      text = `Hola ${name},\n\nEs un honor para nosotros invitarte a celebrar la boda de\n${coupleClean}\n\n🗓 ${dateFormatted}\n🎟 Pases reservados: ${seats} persona(s)\n\nNos encantaría compartir este día tan especial contigo.\nPor favor, ayúdanos confirmando tu asistencia seleccionando una opción abajo:\n\n[ Confirmar Asistencia ] [ No podré asistir ]`;
    } else if (templateType === 2) {
      const venue = activeWedding?.reception_venue || 'Fábrica La Fama';
      const dressCode = activeWedding?.dress_code || 'Rigurosa Etiqueta / Formal';
      text = `¡Hola ${name}! 📍 Te compartimos los detalles de la boda de ${coupleClean}: La recepción se llevará a cabo en ${venue}. Código de vestimenta: ${dressCode}. ¡Te esperamos con mucha alegría!`;
    } else if (templateType === 3) {
      text = `¡Hola ${name}! ✨ ¡Hoy es el gran día de ${coupleClean}! Te esperamos con mucha emoción. Tu mesa asignada es: ${table}. Al llegar, el equipo de coordinación VLB Studio te guiará a tu lugar. ¡A disfrutar!`;
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
                const palette = getAvatarPalette(conv.guest_name, conv.phone);
                const initials = getInitials(conv.guest_name, conv.phone);

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
                    {/* Guest Elegant Avatar with Brand Colors */}
                    <div className="relative shrink-0">
                      <div className={`w-11 h-11 rounded-full ${palette.bg} ${palette.text} ${palette.border} border font-bold text-xs flex items-center justify-center shadow-2xs font-serif tracking-wider`}>
                        {initials}
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
                    {(() => {
                      const activePalette = getAvatarPalette(activeConversation.guest_name, activeConversation.phone);
                      const activeInitials = getInitials(activeConversation.guest_name, activeConversation.phone);
                      return (
                        <div className={`w-10 h-10 rounded-full ${activePalette.bg} ${activePalette.text} ${activePalette.border} border font-bold text-xs flex items-center justify-center font-serif tracking-wider shadow-2xs`}>
                          {activeInitials}
                        </div>
                      );
                    })()}
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
                              <div className="text-[10px] uppercase font-bold tracking-wider text-rose-200 flex items-center justify-between pb-1 border-b border-white/20">
                                <span className="flex items-center gap-1">
                                  <span>💍</span>
                                  <span>Invitación Oficial RSVP</span>
                                </span>
                                <span className="text-[9px] opacity-80">Viva La Bride</span>
                              </div>
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 border-t border-white/20">
                                <span className="px-2.5 py-1 bg-white/20 rounded-md text-[10px] font-semibold text-center flex items-center justify-center gap-1 shadow-2xs">
                                  <span>✓</span>
                                  <span>Confirmo asistencia</span>
                                </span>
                                <span className="px-2.5 py-1 bg-white/15 rounded-md text-[10px] font-semibold text-center flex items-center justify-center gap-1 shadow-2xs">
                                  <span>✕</span>
                                  <span>No asistiré</span>
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

              {/* Error Toast */}
              {sendError && (
                <div className="mx-4 my-2 px-3.5 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{sendError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSendError(null)}
                    className="font-bold text-rose-900 cursor-pointer p-1"
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
                  title="Cargar invitación interactiva oficial RSVP aprobada por Meta (Viva La Bride)"
                >
                  💍 1. Invitación RSVP (Oficial Meta)
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
                    onChange={e => {
                      setNewMessage(e.target.value);
                      if (selectedTemplate) setSelectedTemplate(null);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessageMeta();
                      }
                    }}
                    className="flex-1 px-3.5 py-2 text-xs bg-[#FAF8F5] border border-[#EAE3DA] rounded-xl text-[#332A28] placeholder:text-[#7D6F6B]/60 focus:outline-none focus:border-[#9C665C] leading-relaxed resize-none"
                  />

                  {/* Send Button: Clean, native WhatsApp style */}
                  <button
                    type="button"
                    onClick={() => handleSendMessageMeta()}
                    disabled={sending || !newMessage.trim()}
                    className="px-5 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-40 flex items-center space-x-2 shrink-0"
                    title="Enviar mensaje (Enter)"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sending ? 'Enviando...' : 'Enviar'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#7D6F6B] mt-1.5 px-1">
                  <span>Presiona <strong>Enter</strong> para enviar, <strong>Shift + Enter</strong> para salto de línea</span>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={handleSendInvitationMeta}
                      disabled={sending}
                      className="text-[#A86B60] hover:underline cursor-pointer disabled:opacity-30 font-semibold flex items-center space-x-1"
                      title="Enviar invitación formal configurada (PDF o Enlace) por WhatsApp"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Enviar Invitación Formal</span>
                    </button>
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
