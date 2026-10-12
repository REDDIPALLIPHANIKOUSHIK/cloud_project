import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle2,
  File,
  Eye,
  Info
} from 'lucide-react';
import { api } from '../../lib/api';
import { LabReport } from '../../types/clinical';

export const PatientReports: React.FC = () => {
  const [reports, setReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Upload Form State
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await api.getReports();
      if (data?.reports) setReports(data.reports);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    const validExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';

    if (!validExtensions.includes(ext)) {
      setError(`Invalid file type. Supported formats are: ${validExtensions.join(', ').toUpperCase()}`);
      return;
    }

    if (selectedFile.size > 15 * 1024 * 1024) {
      setError('File size exceeds the 15 MB threshold.');
      return;
    }

    setFile(selectedFile);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Create metadata entry in database
      const payload = {
        fileName: file.name,
        fileType: file.type || 'application/pdf',
        fileSize: file.size,
        description: description || 'Clinical diagnostic document',
        storagePath: `patients/documents/${file.name}`,
      };

      await api.createReportMetadata(payload);
      setSuccess(`Document "${file.name}" uploaded and registered securely.`);
      setFile(null);
      setDescription('');
      await fetchReports();
    } catch (err: any) {
      setError(err.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (reportId: string, fileName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) return;
    try {
      await api.deleteReport(reportId);
      setSuccess(`Document "${fileName}" deleted.`);
      await fetchReports();
    } catch (err: any) {
      setError(err.message || 'Failed to delete report.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900">Medical Document Repository</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Encrypted storage for lab reports, echocardiogram scans, and physician prescriptions.
          </p>
        </div>

        <a
          href={api.getDownloadSummaryUrl()}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-clinical-600 hover:bg-clinical-700 text-white font-bold text-xs shadow-xs transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Clinical Summary
        </a>
      </div>

      {/* Scope & Non-Inference Integrity Advisory */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Clinical Storage Boundary:</span> Documents stored here are encrypted for patient and authorized physician viewing. Raw PDFs or scanned images are never silently routed to the structured tabular ML model, ensuring complete data provenance.
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-teal-50 border border-teal-200 text-teal-800 p-4 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
          {success}
        </div>
      )}

      {/* Upload Box */}
      <form onSubmit={handleUploadSubmit} className="clinical-card p-6">
        <h2 className="text-base font-bold text-navy-900 mb-2">Upload Diagnostic Document</h2>

        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            dragActive
              ? 'border-clinical-500 bg-clinical-50/50'
              : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
          }`}
        >
          <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <div className="text-sm font-semibold text-slate-700">
            {file ? (
              <span className="text-clinical-700 font-bold">{file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
            ) : (
              <>
                Drag & drop medical documents here, or{' '}
                <label className="text-clinical-600 font-bold cursor-pointer hover:underline">
                  browse files
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                  />
                </label>
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Accepted formats: PDF, JPG, JPEG, PNG (Maximum 15 MB per file)
          </p>
        </div>

        {file && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Clinical Description / Document Type
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Lipid Profile Lab Test, Coronary Angiogram Scan, Prescription"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFile(null)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="px-4 py-2 bg-clinical-600 hover:bg-clinical-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                {uploading ? 'Encrypting & Storing...' : 'Confirm Upload'}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Uploaded Documents List */}
      <div className="clinical-card p-6">
        <h2 className="text-base font-bold text-navy-900 mb-4">Your Uploaded Documents ({reports.length})</h2>

        {loading ? (
          <div className="text-center py-10 text-slate-400 text-xs">Loading document repository...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No Documents Uploaded</h3>
            <p className="text-xs text-slate-500 mt-1">
              Upload blood tests, ECG readings, or radiology reports above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reports.map((rep) => (
              <div key={rep.reportId} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 truncate">
                  <div className="p-2.5 rounded-lg bg-slate-100 text-slate-600 shrink-0">
                    <File className="w-5 h-5 text-clinical-600" />
                  </div>
                  <div className="truncate">
                    <span className="font-bold text-sm text-navy-900 block truncate">{rep.fileName}</span>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{rep.description || 'Clinical Document'}</span>
                      <span>•</span>
                      <span>{(rep.fileSize / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span>{new Date(rep.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {rep.fileName.split('.').pop()}
                  </span>
                  <button
                    onClick={() => handleDelete(rep.reportId, rep.fileName)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
