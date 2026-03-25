import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function UploadInvoice() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    buyerName: '', buyerGSTIN: '', invoiceNumber: '', amount: '', dueDate: '', description: ''
  });
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setExtracting(true);
    setError('');
    setAnalysisResult(null);

    // Reset form
    setForm({ buyerName: '', buyerGSTIN: '', invoiceNumber: '', amount: '', dueDate: '', description: '' });

    try {
      // Convert file to base64
      const fileBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(selectedFile);
      });

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await axios.post(`${backendUrl}/api/agents/analyze`, {
        file: { name: selectedFile.name, data: fileBase64 },
        msmeId: user.uid
      });

      if (response.data.success && response.data.analysis) {
        const data = response.data.analysis;
        setForm({
          buyerName: data.extracted?.buyerName || '',
          buyerGSTIN: data.extracted?.buyerGSTIN || '',
          invoiceNumber: data.extracted?.invoiceNumber || '',
          amount: data.extracted?.amount || '',
          dueDate: data.extracted?.dueDate || '',
          description: data.extracted?.description || ''
        });
        setAnalysisResult({
          verified: data.verified,
          message: data.message,
          confidence: data.confidence
        });
      }
    } catch (err) {
      console.error('Failed to extract data', err);
      setError('Failed to auto-extract details. Please ensure it is a valid invoice.');
    }

    setExtracting(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!analysisResult) {
      setError('Please upload an invoice first. AI extraction must complete before submission.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await addDoc(collection(db, 'invoices'), {
        ...form,
        msmeId: user.uid,
        verified: false, // Wait for buyer
        confidence: analysisResult.confidence,
        status: 'pending',
        createdAt: new Date().toISOString(),
        agentStage: 0, // Wait for buyer approval
        buyerConfirmed: false,
        verificationResult: {
          verified: analysisResult.verified,
          confidence: analysisResult.confidence,
          message: 'Waiting for Buyer Approval. AI Pre-check passed.',
          extractedData: form
        }
      });
      navigate('/msme/verification');
    } catch (err) {
      console.error('Submission failed', err);
      setError('Failed to save invoice. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Upload & Verify Invoice</h1>
        <p className="text-surface-400 mt-1">Upload your document. AI will instantly analyze, extract, and authorize the details against company records.</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm flex items-center gap-2">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {/* File Upload zone */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-surface-300 mb-2">Invoice Document (PDF/JPG)</label>
          <label className={`flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed transition-all cursor-pointer ${extracting ? 'border-primary-500 bg-primary-500/10' : 'border-surface-700 hover:border-primary-500/50 bg-surface-800/20'}`}>
            <input type="file" className="hidden" accept=".pdf,.jpg,.png,.jpeg" onChange={handleFileChange} disabled={extracting || submitting} />
            {extracting ? (
              <div className="flex flex-col items-center text-primary-400">
                <div className="w-6 h-6 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin mb-2" />
                <span className="text-sm font-medium">Extracting and Analyzing details...</span>
              </div>
            ) : file ? (
              <div className="flex items-center gap-3 text-accent-400">
                <FileText size={24} />
                <span className="text-sm font-medium">{file.name}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-surface-500">
                <Upload size={24} className="mb-2" />
                <span className="text-sm">Click to upload or drag & drop</span>
                <span className="text-xs mt-1">PDF, JPG, PNG up to 10MB</span>
              </div>
            )}
          </label>
        </div>

        {/* Result Status */}
        {analysisResult && (
          <div className={`mb-8 p-6 rounded-xl border ${analysisResult.verified ? 'bg-success-500/10 border-success-500/30' : 'bg-danger-500/10 border-danger-500/30'}`}>
            <div className="flex items-center gap-3 mb-2">
              {analysisResult.verified ? (
                <CheckCircle className="text-success-400" size={24} />
              ) : (
                <AlertCircle className="text-danger-400" size={24} />
              )}
              <h3 className={`font-semibold text-lg ${analysisResult.verified ? 'text-success-400' : 'text-danger-400'}`}>
                {analysisResult.verified ? 'Invoice Verified Successfully' : 'Verification Failed'}
              </h3>
            </div>
            <p className="text-surface-300 text-sm ml-9">{analysisResult.message}</p>
            {analysisResult.verified && (
               <div className="mt-4 ml-9 px-3 py-1 bg-surface-800/50 border border-surface-700 rounded text-xs text-primary-300 inline-block font-mono">
                 AI Confidence: {Math.round(analysisResult.confidence * 100)}%
               </div>
            )}
          </div>
        )}

        <div className="space-y-5 opacity-90">
          <h3 className="text-surface-300 font-semibold mb-3 border-b border-surface-700 pb-2">AI Extracted Data Readout</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Buyer Name</label>
              <input
                type="text" value={form.buyerName} 
                onChange={(e) => setForm({...form, buyerName: e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-surface-800/20 border border-surface-700/50 text-surface-300 transition-all focus:border-primary-500/50 outline-none"
                placeholder="Auto-filled from document"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Buyer GSTIN</label>
              <input
                type="text" value={form.buyerGSTIN} 
                onChange={(e) => setForm({...form, buyerGSTIN: e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-surface-800/20 border border-surface-700/50 text-surface-300 transition-all focus:border-primary-500/50 outline-none"
                placeholder="Auto-filled from document"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Invoice Number</label>
              <input
                type="text" value={form.invoiceNumber} 
                onChange={(e) => setForm({...form, invoiceNumber: e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-surface-800/20 border border-surface-700/50 text-surface-300 transition-all focus:border-primary-500/50 outline-none"
                placeholder="Auto-filled from document"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Amount (₹)</label>
              <input
                type="text" value={form.amount} 
                onChange={(e) => setForm({...form, amount: e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-surface-800/20 border border-surface-700/50 text-surface-300 transition-all focus:border-primary-500/50 outline-none"
                placeholder="Auto-filled from document"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Due Date</label>
              <input
                type="text" value={form.dueDate} 
                onChange={(e) => setForm({...form, dueDate: e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-surface-800/20 border border-surface-700/50 text-surface-300 transition-all focus:border-primary-500/50 outline-none"
                placeholder="Auto-filled from document"
              />
            </div>
            {analysisResult && (
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Submit to Database <CheckCircle size={18} /></>
                  )}
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Document Description</label>
            <textarea
              rows={3} value={form.description} 
              onChange={(e) => setForm({...form, description: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-surface-800/20 border border-surface-700/50 text-surface-300 transition-all focus:border-primary-500/50 outline-none resize-none"
              placeholder="Auto-filled from document"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
