import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DocumentItem } from '../types';
import {
  FileText, Upload, Download, Trash2, Shield,
  FileCheck, Lock, AlertCircle, Eye, HardDrive
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
    // Authenticated download endpoint
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
        return 'bg-amber-100 text-amber-900 border-amber-200';
      case 'comprobante_pago':
        return 'bg-emerald-100 text-emerald-900 border-emerald-200';
      case 'proveedor':
        return 'bg-blue-100 text-blue-900 border-blue-200';
      case 'operativo':
        return 'bg-stone-100 text-stone-800 border-stone-200';
      case 'civil_iglesia':
        return 'bg-purple-100 text-purple-900 border-purple-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
            Resguardo Seguro VLB
          </span>
          <h2 className="font-serif text-3xl font-bold text-stone-900">
            Documentos y Archivos Privados
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Almacenamiento privado de contratos, cotizaciones, identificaciones y comprobantes de pago.
          </p>
        </div>

        <button
          onClick={() => { setShowUploadModal(true); setSelectedFile(null); setUploadError(''); }}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow transition"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Subir Documento</span>
        </button>
      </div>

      {/* Security Privacy Notice */}
      <div className="p-4 rounded-2xl bg-stone-100/70 border border-stone-200 text-stone-700 flex items-center space-x-3 text-xs">
        <Lock className="w-4 h-4 text-stone-600 shrink-0" />
        <div>
          <strong className="font-semibold text-stone-900">Almacenamiento Privado y Encriptado:</strong> Los archivos no son accesibles mediante URL pública. Cada descarga requiere autenticación activa y pertenencia verificada a esta boda.
        </div>
      </div>

      {/* Documents Grid / Table */}
      <div className="luxury-card rounded-2xl overflow-hidden border border-stone-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                <th className="py-3 px-4">DOCUMENTO</th>
                <th className="py-3 px-4">CATEGORÍA</th>
                <th className="py-3 px-4">TAMAÑO</th>
                <th className="py-3 px-4">SUBIDO POR</th>
                <th className="py-3 px-4">FECHA</th>
                <th className="py-3 px-4">NOTAS</th>
                <th className="py-3 px-3 text-center">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-stone-400">Cargando documentos...</td></tr>
              ) : documents.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-stone-400">No hay documentos cargados en esta boda.</td></tr>
              ) : (
                documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-stone-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <FileCheck className="w-4 h-4 text-lazo-600 shrink-0" />
                        <span className="font-semibold text-stone-900 max-w-xs truncate">{doc.original_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${getCategoryBadge(doc.category)}`}>
                        {doc.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-500">{formatFileSize(doc.file_size)}</td>
                    <td className="py-3 px-4 text-stone-700 font-medium">{doc.uploaded_by}</td>
                    <td className="py-3 px-4 text-stone-500">{new Date(doc.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-stone-500 max-w-xs truncate">{doc.notes || '—'}</td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleDownload(doc.id, doc.original_name)}
                          className="p-1.5 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
                          title="Descargar archivo privado"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {user?.role !== 'STAFF' && (
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-1.5 text-stone-300 hover:text-rose-600 transition"
                            title="Eliminar documento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <h3 className="font-serif text-xl font-bold text-stone-900 mb-2">Subir Documento Privado</h3>
            <p className="text-xs text-stone-500 mb-4">
              El archivo será almacenado con verificación de permisos y control de acceso estricto.
            </p>

            {uploadError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Archivo *</label>
                <input
                  type="file"
                  required
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Categoría</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                >
                  <option value="contrato">Contrato Legal</option>
                  <option value="comprobante_pago">Comprobante de Pago</option>
                  <option value="proveedor">Cotización / Proveedor</option>
                  <option value="operativo">Minuta / Operativo</option>
                  <option value="civil_iglesia">Civil / Iglesia</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Notas / Referencia</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre este comprobante o documento..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-stone-900 text-white rounded-xl hover:bg-stone-800 shadow disabled:opacity-40"
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
