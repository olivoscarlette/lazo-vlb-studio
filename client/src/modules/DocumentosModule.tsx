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
        return 'bg-[#FDF6F5] text-[#9C665C] border border-[#F0D5D1]';
      case 'operativo':
        return 'bg-[#FAF8F5] text-[#5A524C] border border-[#EAE3DA]';
      case 'civil_iglesia':
        return 'bg-[#FAF8F5] text-[#70443D] border border-[#EAE3DA]';
      default:
        return 'bg-[#FAF8F5] text-[#5A524C] border border-[#EAE3DA]';
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
          <span className="text-[11px] uppercase font-bold tracking-widest text-[#8A7E72]">
            Resguardo Seguro VLB
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2B2826] mt-0.5">
            Documentos y Archivos Privados
          </h2>
          <p className="text-sm text-[#8A7E72] mt-1 leading-relaxed">
            Almacenamiento privado de contratos, cotizaciones, identificaciones y comprobantes de pago.
          </p>
        </div>

        <button
          onClick={() => { setShowUploadModal(true); setSelectedFile(null); setUploadError(''); }}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#9C665C] hover:bg-[#8A574E] text-white text-sm font-semibold rounded-xl shadow-xs transition cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>Subir Documento</span>
        </button>
      </div>

      {/* Security Privacy Notice */}
      <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#EAE3DA] text-[#5A524C] flex items-center space-x-3 text-sm">
        <Lock className="w-4 h-4 text-[#9C665C] shrink-0" />
        <div>
          <strong className="font-semibold text-[#2B2826]">Almacenamiento Privado y Encriptado:</strong> Los archivos no son accesibles mediante URL pública. Cada descarga requiere autenticación activa y verificación de permisos en esta boda.
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        <button
          onClick={() => setCategoryFilter('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            categoryFilter === 'ALL'
              ? 'bg-[#9C665C] text-white shadow-xs'
              : 'bg-white text-[#5A524C] hover:bg-[#FAF8F5] border border-[#EAE3DA]'
          }`}
        >
          Todos ({documents.length})
        </button>
        <button
          onClick={() => setCategoryFilter('contrato')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            categoryFilter === 'contrato'
              ? 'bg-[#9C665C] text-white shadow-xs'
              : 'bg-white text-[#5A524C] hover:bg-[#FAF8F5] border border-[#EAE3DA]'
          }`}
        >
          Contratos ({countContratos})
        </button>
        <button
          onClick={() => setCategoryFilter('comprobante_pago')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            categoryFilter === 'comprobante_pago'
              ? 'bg-[#9C665C] text-white shadow-xs'
              : 'bg-white text-[#5A524C] hover:bg-[#FAF8F5] border border-[#EAE3DA]'
          }`}
        >
          Comprobantes ({countPagos})
        </button>
        <button
          onClick={() => setCategoryFilter('proveedor')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            categoryFilter === 'proveedor'
              ? 'bg-[#9C665C] text-white shadow-xs'
              : 'bg-white text-[#5A524C] hover:bg-[#FAF8F5] border border-[#EAE3DA]'
          }`}
        >
          Cotizaciones ({countCotizaciones})
        </button>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-3xl overflow-hidden border border-[#EAE3DA] shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#EAE3DA] text-[11px] font-bold uppercase tracking-wider text-[#8A7E72]">
                <th className="py-3.5 px-5">DOCUMENTO</th>
                <th className="py-3.5 px-4">CATEGORÍA</th>
                <th className="py-3.5 px-4">TAMAÑO</th>
                <th className="py-3.5 px-4">SUBIDO POR</th>
                <th className="py-3.5 px-4">FECHA</th>
                <th className="py-3.5 px-4">NOTAS</th>
                <th className="py-3.5 px-4 text-center">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE3DA]">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-[#8A7E72]">Cargando documentos...</td></tr>
              ) : filteredDocs.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-[#8A7E72]">No hay documentos cargados en esta categoría.</td></tr>
              ) : (
                filteredDocs.map(doc => (
                  <tr key={doc.id} className="hover:bg-[#FAF8F5]/70 transition">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center space-x-2.5">
                        <FileCheck className="w-4 h-4 text-[#9C665C] shrink-0" />
                        <span className="font-semibold text-[#2B2826] max-w-xs truncate">{doc.original_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${getCategoryBadge(doc.category)}`}>
                        {getCategoryLabel(doc.category)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-[#8A7E72]">{formatFileSize(doc.file_size)}</td>
                    <td className="py-3.5 px-4 text-[#5A524C] font-medium">{doc.uploaded_by}</td>
                    <td className="py-3.5 px-4 text-[#8A7E72] text-xs">{new Date(doc.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="py-3.5 px-4 text-[#5A524C] max-w-xs truncate">{doc.notes || '—'}</td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleDownload(doc.id, doc.original_name)}
                          className="p-2 text-[#5A524C] hover:text-[#9C665C] bg-[#FAF8F5] hover:bg-[#EFE8E0] rounded-xl transition border border-[#EAE3DA] cursor-pointer"
                          title="Descargar archivo privado"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {user?.role !== 'STAFF' && (
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-2 text-stone-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                            title="Eliminar documento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Subir Documento */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-[#2B2826]/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#EAE3DA] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-serif text-2xl font-bold text-[#2B2826]">Subir Documento Privado</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-xl text-[#8A7E72] hover:bg-[#FAF8F5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#8A7E72] mb-5">
              El archivo será almacenado con verificación de permisos y control de acceso estricto.
            </p>

            {uploadError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#5A524C] mb-1.5 uppercase tracking-wider">Archivo *</label>
                <input
                  type="file"
                  required
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[#5A524C] file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#FAF8F5] file:text-[#2B2826] hover:file:bg-[#EFE8E0] file:border file:border-[#EAE3DA] file:cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5A524C] mb-1.5 uppercase tracking-wider">Categoría</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 border border-[#EAE3DA] bg-white rounded-xl text-sm focus:ring-2 focus:ring-[#9C665C] focus:outline-none"
                >
                  <option value="contrato">Contrato Legal</option>
                  <option value="comprobante_pago">Comprobante de Pago</option>
                  <option value="proveedor">Cotización / Proveedor</option>
                  <option value="operativo">Minuta / Operativo</option>
                  <option value="civil_iglesia">Civil / Iglesia</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5A524C] mb-1.5 uppercase tracking-wider">Notas / Referencia</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre este comprobante o documento..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#EAE3DA] bg-white rounded-xl text-sm focus:ring-2 focus:ring-[#9C665C] focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#EAE3DA]">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-[#8A7E72] hover:bg-[#FAF8F5] rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider bg-[#9C665C] hover:bg-[#8A574E] text-white rounded-xl shadow-xs disabled:opacity-40 transition cursor-pointer"
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
