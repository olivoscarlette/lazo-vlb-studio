import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Contact2, Phone, MessageSquare, Mail, User,
  Building2, Search, Filter, Sparkles
} from 'lucide-react';

export const DirectorioModule: React.FC = () => {
  const { currentWedding, token } = useAuth();
  const [directory, setDirectory] = useState<{ team: any[]; vendors: any[] }>({ team: [], vendors: [] });
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchDirectory = async () => {
    if (!currentWedding || !token) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/directory`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDirectory(data);
      }
    } catch (err) {
      console.error('Error fetching directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory();
  }, [currentWedding, token]);

  const allContacts = [
    ...directory.team.map(t => ({ ...t, kind: 'TEAM' })),
    ...directory.vendors.map(v => ({ ...v, kind: 'VENDOR' }))
  ];

  const filteredContacts = allContacts.filter(c => {
    const matchesFilter = filterType === 'ALL' || c.kind === filterType;
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search)) ||
      (c.role && c.role.toLowerCase().includes(search.toLowerCase())) ||
      (c.type && c.type.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
            Contactos Rápidos
          </span>
          <h2 className="font-serif text-3xl font-bold text-stone-900">
            Directorio Unificado
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Equipo VLB Studio y proveedores de la boda con enlaces directos para llamada y WhatsApp.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {['ALL', 'TEAM', 'VENDOR'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                filterType === t
                  ? 'bg-stone-900 text-white'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              {t === 'ALL' ? 'Todos los Contactos' : t === 'TEAM' ? 'Equipo VLB' : 'Proveedores'}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, cargo, proveedor o teléfono..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900"
        />
      </div>

      {/* Contacts Grid */}
      {loading ? (
        <div className="py-12 text-center text-stone-400 text-xs">Cargando directorio...</div>
      ) : filteredContacts.length === 0 ? (
        <div className="luxury-card rounded-2xl p-8 text-center text-stone-400 text-xs border border-dashed border-stone-300">
          No se encontraron contactos en el directorio.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((contact, i) => (
            <div
              key={i}
              className="luxury-card rounded-2xl p-5 border border-stone-200 flex flex-col justify-between hover:border-stone-400 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    contact.kind === 'TEAM'
                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                      : 'bg-blue-100 text-blue-900 border border-blue-200'
                  }`}>
                    {contact.kind === 'TEAM' ? 'Equipo VLB' : contact.type || 'Proveedor'}
                  </span>
                  {contact.contact_person && (
                    <span className="text-[10px] text-stone-400">Atención: {contact.contact_person}</span>
                  )}
                </div>

                <h4 className="font-serif text-lg font-bold text-stone-900">{contact.name}</h4>
                <div className="text-xs text-stone-600 font-medium mt-0.5">
                  {contact.role || contact.category}
                </div>

                {contact.email && (
                  <div className="flex items-center space-x-1.5 text-xs text-stone-500 mt-2">
                    <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Call & WhatsApp */}
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center space-x-2">
                {contact.phone ? (
                  <>
                    <a
                      href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp</span>
                    </a>
                    <a
                      href={`tel:${contact.phone}`}
                      className="inline-flex items-center justify-center p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl border border-stone-200 transition"
                      title="Llamar"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </>
                ) : (
                  <span className="text-xs text-stone-400 italic">Sin teléfono registrado</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
