import { useState } from 'react';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Upload, FileText, CheckCircle, AlertCircle, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function UploadInvoice() {
  const { user, userProfile } = useAuth();
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
      // Step 1: Fetch MSME profile from the 'msmes' collection in Firestore
      let msmeProfile = { name: '', gstin: '' };

      // Try matching by GSTIN first (most reliable)
      if (userProfile?.gstin) {
        const byGst = await getDocs(query(collection(db, 'msmes'), where('gst', '==', userProfile.gstin)));
        if (!byGst.empty) {
          const d = byGst.docs[0].data();
          msmeProfile = { name: d.name || '', gstin: d.gst || '' };
        }
      }

      // If not found by GSTIN, try by company name
      if (!msmeProfile.name && userProfile?.companyName) {
        const byName = await getDocs(query(collection(db, 'msmes'), where('name', '==', userProfile.companyName)));
        if (!byName.empty) {
          const d = byName.docs[0].data();
          msmeProfile = { name: d.name || '', gstin: d.gst || '' };
        }
      }

      // Fallback: use auth profile directly
      if (!msmeProfile.name && !msmeProfile.gstin) {
        msmeProfile = {
          name: userProfile?.companyName || '',
          gstin: userProfile?.gstin || ''
        };
      }

      if (!msmeProfile.name && !msmeProfile.gstin) {
        setError('MSME profile not found. Please ensure your Company Name and GSTIN are registered in the system.');
        setExtracting(false);
        return;
      }

      // Step 2: Convert file to base64
      const fileBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(selectedFile);
      });

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await axios.post(`${backendUrl}/api/agents/analyze`, {
        file: { name: selectedFile.name, data: fileBase64 },
        msmeId: user.uid,
        msmeProfile
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
    if (!analysisResult.verified) {
      setError('Invoice rejected: Seller details on the invoice do not match your registered profile. You cannot submit a mismatched invoice.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const authenticity = analysisResult.verified ? 'authentic' : 'suspicious';
      await addDoc(collection(db, 'invoices'), {
        ...form,
        msmeId: user.uid,
        msmeCompanyName: userProfile?.companyName || '',
        verified: false, // Wait for buyer
        confidence: analysisResult.confidence,
        authenticity,
        status: 'pending',
        createdAt: new Date().toISOString(),
        agentStage: 1,
        buyerConfirmed: false,
        stageStatuses: {
          upload: 'completed',
          verification: 'active'
        },
        verificationResult: {
          verified: analysisResult.verified,
          confidence: analysisResult.confidence,
          authenticity,
          message: analysisResult.verified
            ? 'AI verified: Authentic. Waiting for Buyer Approval.'
            : 'AI flagged: Suspicious. Mismatches detected. Waiting for Buyer review.',
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

        {/* Authenticity Result */}
        {analysisResult && (
          <div className={`mb-8 p-6 rounded-xl border ${
            analysisResult.verified
              ? 'bg-success-500/10 border-success-500/30'
              : 'bg-danger-500/10 border-danger-500/30'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              {analysisResult.verified ? (
                <ShieldCheck className="text-success-400" size={28} />
              ) : (
                <ShieldAlert className="text-danger-400" size={28} />
              )}
              <div>
                <h3 className={`font-bold text-lg ${
                  analysisResult.verified ? 'text-success-400' : 'text-danger-400'
                }`}>
                  {analysisResult.verified ? '✅ Authentic Invoice' : '❌ Invoice Rejected'}
                </h3>
                {analysisResult.verified && (
                  <p className="text-surface-400 text-xs mt-0.5">
                    AI Review Complete • Confidence: {Math.round(analysisResult.confidence * 100)}%
                  </p>
                )}
              </div>
            </div>
            <p className="text-surface-300 text-sm ml-10 mb-3">{analysisResult.message}</p>
            <div className="ml-10 flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                analysisResult.verified
                  ? 'bg-success-500/15 text-success-400 border-success-500/30'
                  : 'bg-danger-500/15 text-danger-400 border-danger-500/30'
              }`}>
                {analysisResult.verified ? 'AUTHENTIC' : 'REJECTED'}
              </span>
              {analysisResult.verified && (
                <span className="px-3 py-1 bg-surface-800/50 border border-surface-700 rounded-full text-xs text-primary-300 font-mono">
                  Score: {Math.round(analysisResult.confidence * 100)}/100
                </span>
              )}
            </div>
            {!analysisResult.verified && (
              <p className="text-danger-400 text-xs mt-3 ml-10">❌ This invoice has been rejected due to seller detail mismatches. You cannot submit this invoice.</p>
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
                  disabled={submitting || (analysisResult && !analysisResult.verified)}
                  className={`w-full font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 ${
                    analysisResult && !analysisResult.verified
                      ? 'bg-surface-700 text-surface-500 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                  }`}
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : analysisResult && !analysisResult.verified ? (
                    <>❌ Rejected — Cannot Submit</>
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
