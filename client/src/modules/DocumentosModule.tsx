import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DocumentItem } from '../types';
import {
  FileText, Upload, Download, Trash2, Shield,
  FileCheck, Lock, AlertCircle, HardDrive, Plus, X
} from 'lucide-react';

export const DocumentosModule: React.FC = () => {
  const { currentWedding, token, user } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentItem['category']>('contrato');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const fetchDocuments = async () => {
    if (!currentWedding || !token) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding.id}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [currentWedding, token]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Por favor selecciona un archivo para subir.');
      return;
    }
    setUploading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('category', category);
    formData.append('notes', notes);

    try {
      const res = await fetch(`/api/weddings/${currentWedding!.id}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowUploadModal(false);
      setSelectedFile(null);
      setNotes('');
      await fetchDocuments();
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (docId: string, originalName: string) => {
    const url = `/api/weddings/${currentWedding!.id}/documents/${docId}/download?token=${token}`;
    window.open(url, '_blank');
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('¿Deseas eliminar este archivo del resguardo privado?')) return;
    try {
      const res = await fetch(`/api/weddings/${currentWedding!.id}/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchDocuments();
    } catch {}
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getCategoryBadge = (cat: DocumentItem['category']) => {
    switch (cat) {
      case 'contrato':
        return 'bg-[#FAF3E8] text-[#7C5824] border border-[#EFE3CF]';
      case 'comprobante_pago':
        return 'bg-[#E4ECE5] text-[#2B5235] border border-[#BDD4C1]';
      case 'proveedor':
        return 'bg-[#F7EDEB] text-[#C48B81] border border-[#F0D5D1]';
      case 'operativo':
        return 'bg-[#FAF8F5] text-[#5A524C] border border-[#EFE8E1]';
      case 'civil_iglesia':
        return 'bg-[#FAF8F5] text-[#70443D] border border-[#EFE8E1]';
      default:
        return 'bg-[#FAF8F5] text-[#5A524C] border border-[#EFE8E1]';
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'contrato': return 'Contrato Legal';
      case 'comprobante_pago': return 'Comprobante de Pago';
      case 'proveedor': return 'Cotización / Proveedor';
      case 'operativo': return 'Minuta / Operativo';
      case 'civil_iglesia': return 'Civil / Iglesia';
      default: return cat;
    }
  };

  const filteredDocs = documents.filter(doc => {
    if (categoryFilter === 'ALL') return true;
    return doc.category === categoryFilter;
  });

  const countContratos = documents.filter(d => d.category === 'contrato').length;
  const countPagos = documents.filter(d => d.category === 'comprobante_pago').length;
  const countCotizaciones = documents.filter(d => d.category === 'proveedor').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#8A7E72]">
            Archivo Privado & Contratos
          </span>
          <h2 className="font-novios text-3xl sm:text-4xl text-[#2B2826] mt-1 tracking-tight">
            Documentos de la Boda
          </h2>
          <p className="text-xs sm:text-sm text-[#8A7E72] mt-1.5 leading-relaxed font-light">
            Contratos, cotizaciones, identificaciones y comprobantes organizados en un solo lugar.
          </p>
        </div>

        <button
          onClick={() => { setShowUploadModal(true); setSelectedFile(null); setUploadError(''); }}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-medium rounded-full shadow-2xs transition cursor-pointer shrink-0"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Subir Documento</span>
        </button>
      </div>

      {/* Security Privacy Notice — Sutil y cálido */}
      <div className="px-4 py-3 rounded-2xl bg-[#FAF8F5] border border-[#EFE8E1] text-[#7D6F6B] flex items-center space-x-2.5 text-xs font-light">
        <Lock className="w-3.5 h-3.5 text-[#C48B81] shrink-0" />
        <span>
          <strong className="font-medium text-[#2B2826]">Resguardo privado:</strong> tus archivos están protegidos y solo son accesibles dentro de tu boda.
        </span>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { key: 'ALL', label: `Todos (${documents.length})` },
          { key: 'contrato', label: `Contratos (${countContratos})` },
          { key: 'comprobante_pago', label: `Comprobantes (${countPagos})` },
          { key: 'proveedor', label: `Cotizaciones (${countCotizaciones})` }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setCategoryFilter(tab.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              categoryFilter === tab.key
                ? 'bg-[#2B2826] text-white shadow-2xs'
                : 'bg-white text-[#7D6F6B] hover:bg-[#FAF8F5] hover:text-[#2B2826] border border-[#EFE8E1]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Documents Container */}
      <div className="bg-white rounded-2xl overflow-hidden border border-[#EFE8E1] shadow-2xs">
        {loading ? (
          <div className="py-12 text-center text-[#8A7E72] text-xs font-light">Cargando documentos...</div>
        ) : documents.length === 0 ? (
          /* Luxury Concierge Empty State */
          <div className="py-14 px-5 text-center flex flex-col items-center justify-center bg-[#FAF8F5]/70">
            <div className="w-12 h-12 rounded-full bg-white border border-[#EFE8E1] shadow-2xs flex items-center justify-center mb-3 text-[#C48B81]">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-novios text-2xl text-[#2B2826] font-normal">
              Tu archivo privado comienza aquí
            </h3>
            <p className="text-xs sm:text-sm text-[#8A7E72] max-w-md mt-2 font-light leading-relaxed">
              Guarda contratos firmados, cotizaciones de proveedores y comprobantes de pago para no volver a buscarlos en chats.
            </p>
            <button
              onClick={() => { setShowUploadModal(true); setSelectedFile(null); setUploadError(''); }}
              className="mt-5 inline-flex items-center space-x-1.5 px-5 py-2.5 bg-[#C48B81] hover:bg-[#A86B60] text-white text-xs font-medium rounded-full shadow-2xs transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Subir Primer Documento</span>
            </button>

            <div className="mt-7 pt-5 border-t border-[#EFE8E1]/70 w-full max-w-md flex flex-wrap justify-center gap-2">
              {[
                { label: '+ Contrato', cat: 'contrato' as const },
                { label: '+ Comprobante de Pago', cat: 'comprobante_pago' as const },
                { label: '+ Cotización', cat: 'proveedor' as const },
                { label: '+ Trámites Civil / Iglesia', cat: 'civil_iglesia' as const }
              ].map(chip => (
                <button
                  key={chip.cat}
                  type="button"
                  onClick={() => {
                    setCategory(chip.cat);
                    setSelectedFile(null);
                    setUploadError('');
                    setShowUploadModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-full text-xs bg-white hover:bg-[#F4EFEA] text-[#5A524C] border border-[#EFE8E1] transition shadow-2xs cursor-pointer font-light"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-12 text-center text-[#8A7E72] text-xs font-light">
            No hay documentos cargados en esta categoría.
          </div>
        ) : (
          <>
            {/* Mobile Stacked Cards */}
            <div className="divide-y divide-[#FAF8F5] sm:hidden">
              {filteredDocs.map(doc => (
                <div key={doc.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <FileCheck className="w-4 h-4 text-[#C48B81] shrink-0" />
                      <span className="font-medium text-sm text-[#2B2826] truncate">{doc.original_name}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full ${getCategoryBadge(doc.category)}`}>
                        {getCategoryLabel(doc.category)}
                      </span>
                      <span className="text-[11px] text-[#8A7E72] font-light">
                        {formatFileSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    {doc.notes && <p className="text-xs text-[#7D6F6B] font-light">{doc.notes}</p>}
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handleDownload(doc.id, doc.original_name)}
                      className="p-2 text-[#5A524C] hover:text-[#C48B81] bg-[#FAF8F5] rounded-full border border-[#EFE8E1] cursor-pointer"
                      title="Descargar"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    {user?.role !== 'STAFF' && (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 text-[#8A7E72]/60 hover:text-rose-600 rounded-full cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Clean Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#EFE8E1] text-[11px] font-semibold uppercase tracking-wider text-[#8A7E72]">
                    <th className="py-3.5 px-5">DOCUMENTO</th>
                    <th className="py-3.5 px-4">CATEGORÍA</th>
                    <th className="py-3.5 px-4">TAMAÑO</th>
                    <th className="py-3.5 px-4">SUBIDO POR</th>
                    <th className="py-3.5 px-4">FECHA</th>
                    <th className="py-3.5 px-4">NOTAS</th>
                    <th className="py-3.5 px-4 text-center">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF8F5]">
                  {filteredDocs.map(doc => (
                    <tr key={doc.id} className="hover:bg-[#FAF8F5]/60 transition group">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center space-x-2.5">
                          <FileCheck className="w-4 h-4 text-[#C48B81] shrink-0" />
                          <span className="font-medium text-sm text-[#2B2826] max-w-xs truncate">{doc.original_name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${getCategoryBadge(doc.category)}`}>
                          {getCategoryLabel(doc.category)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-[#8A7E72]">{formatFileSize(doc.file_size)}</td>
                      <td className="py-3.5 px-4 text-[#5A524C] font-light">{doc.uploaded_by}</td>
                      <td className="py-3.5 px-4 text-[#8A7E72] text-xs font-light">{new Date(doc.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="py-3.5 px-4 text-[#7D6F6B] max-w-xs truncate font-light">{doc.notes || '—'}</td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleDownload(doc.id, doc.original_name)}
                            className="p-2 text-[#5A524C] hover:text-[#C48B81] bg-[#FAF8F5] hover:bg-[#EFE8E0] rounded-full transition border border-[#EFE8E1] cursor-pointer"
                            title="Descargar archivo privado"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {user?.role !== 'STAFF' && (
                            <button
                              onClick={() => handleDelete(doc.id)}
                              className="p-2 text-[#8A7E72]/50 opacity-0 group-hover:opacity-100 hover:text-rose-600 hover:bg-rose-50 rounded-full transition cursor-pointer"
                              title="Eliminar documento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal: Subir Documento */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-[#2B2826]/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#EFE8E1] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-novios text-2xl font-normal text-[#2B2826]">Subir Documento</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 rounded-full text-[#8A7E72] hover:bg-[#FAF8F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#8A7E72] mb-5 font-light">
              Guarda contratos, comprobantes o cotizaciones de forma privada para tu boda.
            </p>

            {uploadError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#5A524C] mb-1.5 uppercase tracking-wider">Archivo *</label>
                <input
                  type="file"
                  required
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[#5A524C] file:mr-3 file:py-2 file:px-3.5 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-[#FAF8F5] file:text-[#2B2826] hover:file:bg-[#EFE8E0] file:border file:border-[#EFE8E1] file:cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5A524C] mb-1.5 uppercase tracking-wider">Categoría</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 border border-[#EFE8E1] bg-[#FAF8F5] rounded-xl text-sm focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                >
                  <option value="contrato">Contrato Legal</option>
                  <option value="comprobante_pago">Comprobante de Pago</option>
                  <option value="proveedor">Cotización / Proveedor</option>
                  <option value="operativo">Minuta / Operativo</option>
                  <option value="civil_iglesia">Civil / Iglesia</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5A524C] mb-1.5 uppercase tracking-wider">Notas / Referencia</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre este comprobante o documento..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#EFE8E1] bg-[#FAF8F5] rounded-xl text-sm focus:ring-2 focus:ring-[#C48B81] focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#FAF8F5]">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#8A7E72] hover:bg-[#FAF8F5] rounded-full transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 text-xs font-medium bg-[#C48B81] hover:bg-[#A86B60] text-white rounded-full shadow-2xs disabled:opacity-40 transition cursor-pointer"
                >
                  {uploading ? 'Subiendo...' : 'Subir y Resguardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
