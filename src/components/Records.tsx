import React, { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Sale, type GoldPurchase } from '../db';
import { translations, type Language } from '../translations';
import { Search, Printer, Trash2, Edit, MessageCircle, X, AlertTriangle, History, Download, AlertCircle, ShoppingCart, Tag, Eye, EyeOff, Check, Scale, Sparkles, Hammer, Filter, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatWhatsAppUrl } from '../lib/utils';
import { useReactToPrint } from 'react-to-print';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PrintReceipt } from './PrintReceipt';
import { ConfirmModal } from './ConfirmModal';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { Printer as CapPrinter } from '@capgo/capacitor-printer';

import { APP_CONFIG } from '../config';

import ImageLightbox from './ImageLightbox';
import WhatsAppShareModal, { type WhatsAppShareData } from './WhatsAppShareModal';

interface RecordsProps {
  lang: Language;
  setActiveSection: (section: any) => void;
  setEditingSale: (sale: Sale | null) => void;
}

export default function Records({ lang, setActiveSection, setEditingSale }: RecordsProps) {
  const t = translations[lang];
  const isUrdu = lang === 'ur';
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'sales' | 'purchases'>('sales');
  const [filterStatus, setFilterStatus] = useState<'all' | 'baqaya' | 'clear'>('all');
  const [showSummary, setShowSummary] = useState(true);

  const [printData, setPrintData] = useState<{ data: Sale | GoldPurchase, id: number, type: 'sale' | 'purchase' } | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [lightboxData, setLightboxData] = useState<{ img: string; title?: string; phone?: string; name?: string; caption?: string } | null>(null);
  const [whatsappModalData, setWhatsappModalData] = useState<WhatsAppShareData | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<{ id: number, type: 'sale' | 'purchase' } | null>(null);
  const [expandedSales, setExpandedSales] = useState<Record<number, boolean>>({});
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${printData?.type === 'sale' ? 'Bill' : 'Purchase'}_${printData?.id || 'record'}`,
    onAfterPrint: () => {
      setIsPrinting(false);
    }
  });

  const executePrint = async () => {
    if (Capacitor.isNativePlatform() && pdfUrl) {
      try {
        const base64Data = pdfUrl.split(',')[1];
        await CapPrinter.printBase64({
          name: `${printData?.type === 'sale' ? 'Bill' : 'Purchase'}_${printData?.id || 'record'}`,
          data: base64Data,
          mimeType: 'application/pdf',
        });
      } catch (e) {
        console.error('Error with native print', e);
        handlePrint();
      }
    } else {
      handlePrint();
    }
  };

  const generatePDF = async (data: any, id: number, type: 'sale' | 'purchase'): Promise<string | null> => {
    if (!printRef.current) return null;
    setIsPrinting(true);
    const isPurchase = type === 'purchase';
    const widthStr = isPurchase ? '1000px' : '800px';
    const heightStr = isPurchase ? '1414px' : '1135px';
    const pdfWidth = isPurchase ? 21.0 : 14.8;
    const windowWidthVal = isPurchase ? 1000 : 800;

    try {
      window.scrollTo(0, 0);
      
      const canvas = await html2canvas(printRef.current, {
        scale: 3.0, // 1.0x avoids sub-pixel scaling calculations and is faster
        useCORS: true, // Disable CORS to avoid hanging on stylesheet downloads/fonts
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: false,
        imageTimeout: 2000, // No timeout latency for image rendering
        windowWidth: windowWidthVal, // Explicitly set viewport width to prevent narrow responsive wrapping
        onclone: (clonedDoc) => {
          clonedDoc.body.style.margin = '0';
          clonedDoc.body.style.padding = '0';
          clonedDoc.body.style.backgroundColor = '#ffffff';
          clonedDoc.body.style.width = widthStr;
          const el = clonedDoc.querySelector('.print-receipt-container') as HTMLElement;
          if (el) {
            clonedDoc.body.innerHTML = '';
            clonedDoc.body.appendChild(el);
            el.style.margin = '0';
            el.style.padding = '0.8cm';
            el.style.width = widthStr;
            el.style.minHeight = heightStr;
            el.style.height = 'auto';
            el.style.display = 'block';
            el.style.position = 'relative';
          }
        }
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.8); // JPEG encoding is significantly faster than PNG

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const pdfHeight = (canvasHeight / canvasWidth) * pdfWidth;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'cm',
        format: [pdfWidth, pdfHeight]
      });
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight); // JPEG embedding is instantaneous in jsPDF
      return pdf.output('datauristring');
    } catch (error) {
      console.error("PDF Error:", error);
      return null;
    } finally {
      setIsPrinting(false);
    }
  };

  const downloadPDF = async () => {
    if (!pdfUrl) return;

    if (Capacitor.isNativePlatform()) {
      try {
        const fileName = `${printData?.type === 'sale' ? 'Bill' : 'Purchase'}_${printData?.id || Date.now()}.pdf`;
        const base64Data = pdfUrl.split(',')[1];

        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
        });

        await Share.share({
          title: printData?.type === 'sale' ? 'Bill Receipt' : 'Purchase Receipt',
          url: savedFile.uri,
        });
      } catch (e) {
        console.error('Error sharing PDF', e);
        alert(lang === 'ur' ? "فائل شیئر کرنے میں خرابی پیش آئی" : "Error sharing file");
      }
    } else {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${printData?.type === 'sale' ? 'Bill' : 'Purchase'}_${printData?.id || 'record'}.pdf`;
      link.click();
    }
  };

  const rawSales = useLiveQuery(() => {
    if (!db.sales) return Promise.resolve([]);
    if (!searchTerm) return db.sales.orderBy('id').reverse().toArray();
    
    const term = searchTerm.toLowerCase();
    return db.sales
      .filter(sale => 
        sale.name.toLowerCase().includes(term) || 
        sale.phone.includes(searchTerm) ||
        sale.id?.toString() === searchTerm ||
        sale.items.some(item => item.n.toLowerCase().includes(term))
      )
      .reverse()
      .toArray();
  }, [searchTerm]);

  const allSalesCount = rawSales?.length || 0;
  const baqayaCount = rawSales?.filter(s => s.rem > 0).length || 0;
  const clearCount = rawSales?.filter(s => s.rem <= 0).length || 0;

  const sales = (rawSales || []).filter(sale => {
    if (filterStatus === 'baqaya') return sale.rem > 0;
    if (filterStatus === 'clear') return sale.rem <= 0;
    return true;
  });

  // Calculate totals across the active/filtered sales list: total weight, total polish, total mazdori
  const salesTotals = (sales || []).reduce((acc, sale) => {
    let billWeight = 0;
    let billPolish = 0;
    let billMazdori = 0;

    (sale.items || []).forEach(item => {
      // Normal sale items weight
      if (item.t >= 0) {
        billWeight += (Number(item.w) || 0);
      }
      billPolish += (Number(item.mk) || 0);
      const mz = item.mz !== undefined ? Number(item.mz) : Math.max(0, Math.round(item.t - (item.w + (item.mk || 0)) * item.r));
      billMazdori += mz;
    });

    acc.weight += billWeight;
    acc.polish += billPolish;
    acc.mazdori += billMazdori;
    acc.total += (sale.total || 0);
    acc.rec += (sale.rec || 0);
    acc.rem += (sale.rem || 0);
    return acc;
  }, { weight: 0, polish: 0, mazdori: 0, total: 0, rec: 0, rem: 0 });

  const purchases = useLiveQuery(() => {
    if (!db.goldPurchases) return Promise.resolve([]);
    if (!searchTerm) return db.goldPurchases.orderBy('id').reverse().toArray();
    
    const term = searchTerm.toLowerCase();
    return db.goldPurchases
      .filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.phone.includes(searchTerm) ||
        p.id?.toString() === searchTerm
      )
      .reverse()
      .toArray();
  }, [searchTerm]);

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteId.type === 'sale') {
      await db.sales.delete(deleteId.id);
    } else {
      await db.goldPurchases.delete(deleteId.id);
    }
    setDeleteId(null);
  };

  const handleUpdate = (sale: Sale) => {
    setEditingSale(sale);
    setActiveSection('billing');
  };

  const shareWhatsApp = (data: Sale) => {
    const message = `*${APP_CONFIG.shopNameUrdu}: سیل بل*\n` +
      `گاہک: ${data.name}\n` +
      `تاریخ: ${data.date}\n` +
      `کل رقم: Rs. ${data.total.toLocaleString()}\n` +
      `وصول شدہ: Rs. ${data.rec.toLocaleString()}\n` +
      `باقی رقم: Rs. ${data.rem.toLocaleString()}\n` +
      `شکریہ!`;
    
    const url = formatWhatsAppUrl(data.phone, message);
    if (url) window.open(url, '_blank');
  };

  const sharePurchaseWhatsApp = (p: GoldPurchase) => {
    const msg = `*${APP_CONFIG.shopNameUrdu}: خریداری رسید*\n` +
      `بیچنے والا: ${p.name}\n` +
      `وزن: ${p.weight}g\n` +
      `ریٹ: ${p.rate.toLocaleString()}\n` +
      `کل رقم: Rs. ${p.total.toLocaleString()}\n` +
      `تاریخ: ${p.date}\n` +
      `شکریہ!`;
    const url = formatWhatsAppUrl(p.phone, msg);
    if (url) window.open(url, '_blank');
  };

    return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Image Modal & WhatsApp Share Modal */}
      {lightboxData && (
        <ImageLightbox 
          src={lightboxData.img} 
          onClose={() => setLightboxData(null)} 
          title={lightboxData.title || (lang === 'ur' ? 'تصویر ریکارڈ' : 'Record Image')}
          phone={lightboxData.phone}
          customerName={lightboxData.name}
          caption={lightboxData.caption}
          onOpenWhatsAppModal={() => {
            const current = lightboxData;
            setLightboxData(null);
            setWhatsappModalData(current);
          }}
        />
      )}

      {whatsappModalData && (
        <WhatsAppShareModal 
          data={whatsappModalData}
          onClose={() => setWhatsappModalData(null)}
          lang={lang}
        />
      )}

      <ConfirmModal 
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={lang === 'ur' ? 'ڈیلیٹ کریں؟' : 'Confirm Delete'}
        message={lang === 'ur' ? 'کیا آپ واقعی اس ریکارڈ کو حذف کرنا چاہتے ہیں؟' : 'Are you sure you want to delete this record?'}
        lang={lang}
      />
      
      {/* Print Preview Modal */}
      {showPrintPreview && printData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black-80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-zinc-50">
              <h3 className="text-xl font-bold urdu-text text-black">
                {printData.type === 'sale' ? 'بل کی تفصیل (Bill Preview)' : 'خریداری کی تفصیل (Purchase Preview)'}
              </h3>
              <button 
                type="button"
                onClick={() => {
                  setShowPrintPreview(false);
                  setPrintData(null);
                  setPdfUrl(null);
                }}
                className="p-2 hover:bg-zinc-200 rounded-full transition-colors text-black"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-zinc-200 flex justify-center scrollbar-thin scrollbar-thumb-zinc-400">
              <div className="bg-white shadow-2xl origin-top transition-transform duration-300 transform scale-[0.6] sm:scale-[0.75] md:scale-[0.85] lg:scale-100">
                <PrintReceipt 
                  ref={printRef}
                  type={printData.type} 
                  data={printData.data} 
                  id={printData.id} 
                />
              </div>
              
              {!pdfUrl && (
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] font-bold text-zinc-600 urdu-text">پی ڈی ایف تیار ہو رہا ہے...</span>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-white flex flex-wrap gap-3">
              <button 
                type="button"
                onClick={executePrint}
                className="flex-1 min-w-[140px] bg-sky-600 hover:bg-sky-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-lg shadow-lg"
              >
                <Printer size={24} />
                <span className="urdu-text text-xl">پرنٹ کریں (Print)</span>
              </button>

              <button 
                type="button"
                disabled={!pdfUrl}
                onClick={downloadPDF}
                className="flex-1 min-w-[200px] bg-gold hover:bg-gold-light text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-lg shadow-lg disabled:opacity-50"
              >
                <Download size={24} />
                <span className="urdu-text text-xl text-black">پی ڈی ایف (Download PDF)</span>
              </button>

              <button 
                type="button"
                onClick={() => {
                  setShowPrintPreview(false);
                  setPrintData(null);
                  setPdfUrl(null);
                }}
                className="px-6 bg-zinc-100 text-zinc-600 font-bold py-4 rounded-xl hover:bg-zinc-200 transition-all urdu-text text-xl"
              >
                بند کریں
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gold-dark urdu-text">{t.records}</h2>
            <p className="text-zinc-500 text-sm">{lang === 'ur' ? 'تمام ریکارڈز یہاں دیکھیں' : 'View all records here'}</p>
          </div>
          
          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={lang === 'ur' ? 'تلاش کریں...' : 'Search...'}
              className="w-full pl-10 pr-10 py-2 bg-white border border-sky-200 rounded-lg focus:ring-2 focus:ring-gold outline-none transition-all text-black shadow-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-red-500 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="flex p-1 bg-sky-100 rounded-xl w-fit shadow-inner">
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all urdu-text ${activeTab === 'sales' ? "bg-white text-gold-dark shadow-md" : "text-sky-600 hover:bg-white-50"}`}
          >
            <ShoppingCart size={18} />
            سیلز (Sales)
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all urdu-text ${activeTab === 'purchases' ? "bg-white text-gold-dark shadow-md" : "text-sky-600 hover:bg-white-50"}`}
          >
            <Tag size={18} />
            خریداری (Purchases)
          </button>
        </div>

        {activeTab === 'sales' && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-zinc-500 urdu-text flex items-center gap-1">
                <Filter size={14} className="text-gold-dark" />
                {isUrdu ? 'بل فلٹر:' : 'Filter Bills:'}
              </span>
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all urdu-text flex items-center gap-1.5 ${
                  filterStatus === 'all'
                    ? 'bg-sky-900 text-gold shadow-sm ring-2 ring-gold/40'
                    : 'bg-white text-zinc-700 hover:bg-sky-50 border border-sky-200'
                }`}
              >
                <span>{isUrdu ? 'تمام بلز' : 'All Bills'}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterStatus === 'all' ? 'bg-gold/20 text-gold' : 'bg-zinc-100 text-zinc-600'}`}>
                  {allSalesCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus('baqaya')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all urdu-text flex items-center gap-1.5 ${
                  filterStatus === 'baqaya'
                    ? 'bg-red-700 text-white shadow-sm ring-2 ring-red-400'
                    : 'bg-white text-red-700 hover:bg-red-50 border border-red-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <span>{isUrdu ? 'بقایا دار' : 'Baqaya'}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterStatus === 'baqaya' ? 'bg-red-900 text-white' : 'bg-red-100 text-red-700'}`}>
                  {baqayaCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus('clear')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all urdu-text flex items-center gap-1.5 ${
                  filterStatus === 'clear'
                    ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-400'
                    : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                }`}
              >
                <Check size={14} className="stroke-[3]" />
                <span>{isUrdu ? 'صاف (کلیئر)' : 'Clear'}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterStatus === 'clear' ? 'bg-emerald-900 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                  {clearCount}
                </span>
              </button>
            </div>

            {/* Option to show/hide total weight, polish, mazdori */}
            <button
              type="button"
              onClick={() => setShowSummary(prev => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all urdu-text shadow-sm"
            >
              {showSummary ? <EyeOff size={15} className="text-amber-700" /> : <Eye size={15} className="text-amber-700" />}
              <span>
                {showSummary 
                  ? (isUrdu ? 'خلاصہ چھپائیں' : 'Hide Totals')
                  : (isUrdu ? 'مجموعی خلاصہ دیکھیں (وزن، پالش، مزدوری)' : 'Show Totals (Weight, Polish, Mazdori)')}
              </span>
            </button>
          </div>
        )}

        {/* Summary Cards */}
        {activeTab === 'sales' && showSummary && (
          <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-sky-950 text-white p-5 rounded-2xl shadow-lg border border-gold/30">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-sky-700/60">
              <div className="flex items-center gap-2">
                <Scale className="text-gold" size={20} />
                <h3 className="text-base font-bold text-gold urdu-text">
                  {isUrdu ? 'مجموعی سیلز خلاصہ (کل وزن، کل پالش اور کل مزدوری)' : 'Sales Totals Summary (Weight, Polish & Mazdori)'}
                </h3>
              </div>
              <span className="text-xs text-sky-200 urdu-text font-mono">
                {isUrdu ? `بلز تعداد: ${sales.length}` : `Bills: ${sales.length}`}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between text-amber-300 text-xs mb-1">
                  <span className="urdu-text font-bold">{isUrdu ? 'کل سیل وزن' : 'Total Sale Wt'}</span>
                  <Scale size={16} />
                </div>
                <div className="text-2xl font-black font-mono text-white">
                  {salesTotals.weight.toFixed(2)} <span className="text-xs font-normal text-amber-200">g</span>
                </div>
                <div className="text-[10px] text-sky-200 urdu-text mt-0.5">
                  {isUrdu ? 'فروخت شدہ سونے کا وزن' : 'Sold gold weight'}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between text-sky-300 text-xs mb-1">
                  <span className="urdu-text font-bold">{isUrdu ? 'کل پالش' : 'Total Polish'}</span>
                  <Sparkles size={16} />
                </div>
                <div className="text-2xl font-black font-mono text-white">
                  {salesTotals.polish.toFixed(2)} <span className="text-xs font-normal text-sky-200">g</span>
                </div>
                <div className="text-[10px] text-sky-200 urdu-text mt-0.5">
                  {isUrdu ? 'پالش کا مجموعی وزن' : 'Total polish weight'}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between text-emerald-300 text-xs mb-1">
                  <span className="urdu-text font-bold">{isUrdu ? 'کل مزدوری' : 'Total Mazdori'}</span>
                  <Hammer size={16} />
                </div>
                <div className="text-2xl font-black font-mono text-white">
                  Rs. {salesTotals.mazdori.toLocaleString()}
                </div>
                <div className="text-[10px] text-sky-200 urdu-text mt-0.5">
                  {isUrdu ? 'تمام آئٹمز کی مزدوری' : 'Total labor charges'}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between text-red-300 text-xs mb-1">
                  <span className="urdu-text font-bold">{isUrdu ? 'کل بقایا' : 'Total Baqaya'}</span>
                  <AlertCircle size={16} />
                </div>
                <div className="text-2xl font-black font-mono text-white">
                  Rs. {salesTotals.rem.toLocaleString()}
                </div>
                <div className="text-[10px] text-sky-200 urdu-text mt-0.5">
                  {isUrdu ? 'غیر وصول شدہ رقم' : 'Pending balance'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Records List */}
      <AnimatePresence mode="wait">
        {activeTab === 'sales' ? (
          <motion.div 
            key="sales"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {sales?.map((sale) => {
              const billWeight = (sale.items || []).reduce((sum, item) => item.t >= 0 ? sum + (Number(item.w) || 0) : sum, 0);
              const billPolish = (sale.items || []).reduce((sum, item) => sum + (Number(item.mk) || 0), 0);
              const billMazdori = (sale.items || []).reduce((sum, item) => {
                const mz = item.mz !== undefined ? Number(item.mz) : Math.max(0, Math.round(item.t - (item.w + (item.mk || 0)) * item.r));
                return sum + mz;
              }, 0);
              const isClear = sale.rem <= 0;

              return (
              <div
                key={sale.id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${
                  isClear ? 'border-emerald-200' : 'border-red-200'
                }`}
                style={{ borderTop: `4px solid ${isClear ? '#10b981' : '#ef4444'}` }}
              >
                <div className="p-5 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 urdu-text">{sale.name}</h3>
                      <p className="text-xs text-zinc-500" dir="ltr">{sale.phone}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="px-2 py-0.5 bg-sky-50 text-gold-dark rounded text-[10px] font-bold border border-gold-20">
                        #{sale.id}
                      </div>
                      {/* Prominent Baqaya / Clear Label */}
                      {isClear ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 urdu-text shadow-xs">
                          <Check size={13} className="stroke-[3] text-emerald-700" />
                          {isUrdu ? 'صاف' : 'Clear'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-700 border border-red-300 urdu-text shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                          {isUrdu ? 'بقایا' : 'Baqaya'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">{t.date}</p>
                      <p className="font-medium text-zinc-700">{sale.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">{t.totalAmount}</p>
                      <p className="font-bold text-gold-dark">Rs. {sale.total.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-sky-50 rounded-lg text-xs border border-sky-100">
                    <div>
                      <span className="text-zinc-500 urdu-text">{t.receivedAmount}: </span>
                      <span className="font-bold text-green-600">Rs. {sale.rec.toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-zinc-500 urdu-text">{t.remainingAmount}: </span>
                      <span className={`font-bold ${isClear ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isClear ? (isUrdu ? '0 (صاف)' : '0 (Clear)') : `Rs. ${sale.rem.toLocaleString()}`}
                      </span>
                    </div>
                  </div>

                  {/* Weight, Polish, Mazdori breakdown per bill */}
                  <div className="grid grid-cols-3 gap-1 p-2 bg-zinc-50 rounded-lg text-[11px] border border-zinc-200 font-mono">
                    <div className="text-center">
                      <span className="block text-[9px] text-zinc-500 font-sans urdu-text font-bold">{isUrdu ? 'وزن' : 'Weight'}</span>
                      <span className="font-bold text-zinc-800">{billWeight.toFixed(2)}g</span>
                    </div>
                    <div className="text-center border-x border-zinc-200">
                      <span className="block text-[9px] text-zinc-500 font-sans urdu-text font-bold">{isUrdu ? 'پالش' : 'Polish'}</span>
                      <span className="font-bold text-zinc-800">{billPolish.toFixed(2)}g</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[9px] text-zinc-500 font-sans urdu-text font-bold">{isUrdu ? 'مزدوری' : 'Mazdori'}</span>
                      <span className="font-bold text-zinc-800">Rs. {billMazdori.toLocaleString()}</span>
                    </div>
                  </div>

                  {sale.items && sale.items.length > 0 && (
                    <div className="pt-2 border-t border-sky-100">
                      <button
                        type="button"
                        onClick={() => setExpandedSales(prev => ({ ...prev, [sale.id!]: !prev[sale.id!] }))}
                        className="w-full flex items-center justify-between text-xs text-sky-600 hover:text-sky-800 font-bold py-1 urdu-text"
                      >
                        <span>{expandedSales[sale.id!] ? (isUrdu ? 'آئٹمز چھپائیں' : 'Hide Items') : (isUrdu ? 'آئٹمز دیکھیں' : 'View Items')} ({sale.items.length})</span>
                        <span className="text-[10px] bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                          {expandedSales[sale.id!] ? '▲' : '▼'}
                        </span>
                      </button>

                      {expandedSales[sale.id!] && (
                        <div className="mt-2 space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                          {sale.items.map((item, idx) => (
                            <div key={idx} className="flex gap-2 items-center p-2 bg-sky-50/50 rounded-lg border border-sky-100/50">
                              {item.img && (
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <div 
                                    onClick={() => setLightboxData({
                                      img: item.img!,
                                      title: `${item.n} (${sale.name})`,
                                      phone: sale.phone,
                                      name: sale.name,
                                      caption: `*${APP_CONFIG.shopNameUrdu}: آئٹم تصویر*\nگاہک: ${sale.name}\nآئٹم: ${item.n}\nوزن: ${item.w}g\nبل نمبر: #${sale.id}\nشکریہ!`
                                    })}
                                    className="w-10 h-10 rounded-md overflow-hidden border border-sky-200 cursor-pointer hover:border-gold hover:scale-105 transition-all shadow-xs"
                                    title={isUrdu ? "تصویر دیکھیں اور ڈاؤنلوڈ کریں" : "View and Download Image"}
                                  >
                                    <img src={item.img} alt={item.n} className="w-full h-full object-cover" />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setWhatsappModalData({
                                      img: item.img!,
                                      phone: sale.phone,
                                      name: sale.name,
                                      caption: `*${APP_CONFIG.shopNameUrdu}: آئٹم تصویر*\nگاہک: ${sale.name}\nآئٹم: ${item.n}\nوزن: ${item.w}g\nبل نمبر: #${sale.id}\nشکریہ!`,
                                      title: `${item.n} (${sale.name})`
                                    })}
                                    className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs transition-colors flex items-center justify-center shadow-xs"
                                    title={isUrdu ? 'آئٹم کی تصویر واٹس ایپ کریں' : 'Send item image via WhatsApp'}
                                  >
                                    <MessageCircle size={14} />
                                  </button>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-zinc-800 truncate urdu-text">{item.n}</p>
                                <p className="text-[10px] text-zinc-500 font-mono">
                                  {item.q} Pcs | {item.w}g @ {item.r.toLocaleString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className={`text-xs font-black ${item.t < 0 ? 'text-red-600' : 'text-zinc-900'}`}>
                                  {item.t < 0 ? '-' : ''}Rs. {Math.abs(item.t).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => {
                        if (sale.id) {
                          setPrintData({ data: sale, id: sale.id, type: 'sale' });
                          setShowPrintPreview(true);
                          setTimeout(async () => {
                            const url = await generatePDF(sale, sale.id!, 'sale');
                      if (url) {
                        setPdfUrl(url);
                      } else {
                        setShowPrintPreview(false);
                        alert('PDF generation failed. Please try again or check the image format.');
                      }
                          }, 400);
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-2 p-2 bg-sky-50 text-gold-dark rounded-lg hover:bg-gold hover:text-black transition-colors border border-gold-20"
                    >
                      <Printer size={16} />
                      <span className="text-xs font-bold urdu-text">{t.print}</span>
                    </button>
                    <button
                      onClick={() => handleUpdate(sale)}
                      className="p-2 bg-sky-50 text-zinc-600 hover:bg-gold hover:text-black rounded-lg transition-colors border border-sky-200"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => shareWhatsApp(sale)}
                      className="p-2 bg-green-600-10 text-green-600 hover:bg-green-600 hover:text-white rounded-lg transition-colors border border-green-600-20"
                      title={isUrdu ? 'سیل بل میسج واٹس ایپ کریں' : 'Send bill message on WhatsApp'}
                    >
                      <MessageCircle size={16} />
                    </button>
                    {sale.items?.some(i => i.img) && (
                      <button
                        type="button"
                        onClick={() => {
                          const firstImg = sale.items.find(i => i.img);
                          if (firstImg?.img) {
                            setWhatsappModalData({
                              img: firstImg.img,
                              phone: sale.phone,
                              name: sale.name,
                              caption: `*${APP_CONFIG.shopNameUrdu}: محفوظ شدہ تصویر*\nگاہک: ${sale.name}\nآئٹم: ${firstImg.n}\nوزن: ${firstImg.w}g\nبل نمبر: #${sale.id}\nشکریہ!`,
                              title: `${firstImg.n} (${sale.name})`
                            });
                          }
                        }}
                        className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors border border-emerald-700/20 shadow-xs flex items-center justify-center"
                        title={isUrdu ? 'محفوظ شدہ تصویر واٹس ایپ کریں' : 'Send saved picture via WhatsApp'}
                      >
                        <Camera size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => sale.id && setDeleteId({ id: sale.id, type: 'sale' })}
                      className="p-2 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-colors border border-red-200"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
            {sales?.length === 0 && <EmptyState lang={lang} />}
          </motion.div>
        ) : (
          <motion.div 
            key="purchases"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {purchases?.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-xl shadow-sm border border-sky-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 urdu-text">{p.name}</h3>
                      <p className="text-xs text-zinc-500" dir="ltr">{p.phone}</p>
                    </div>
                    <div className="px-2 py-1 bg-gold-10 text-gold-dark rounded text-[10px] font-bold border border-gold-20">
                      #{p.id}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">{t.date}</p>
                      <p className="font-medium text-zinc-700">{p.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold text-gold-dark">خریداری رقم</p>
                      <p className="font-bold text-gold-dark">Rs. {p.total.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-sky-50 rounded-lg text-xs border border-sky-100">
                    <div>
                      <span className="text-zinc-500 urdu-text">وزن (Wt): </span>
                      <span className="font-bold text-zinc-700">{p.weight}g</span>
                    </div>
                    <div className="text-right">
                      <span className="text-zinc-500 urdu-text">ریٹ (Rate): </span>
                      <span className="font-bold text-zinc-700">{p.rate.toLocaleString()}</span>
                    </div>
                  </div>

                    <div className="flex items-center gap-2 pt-2">
                    {p.img && (
                      <>
                        <button
                          type="button"
                          onClick={() => setLightboxData({
                            img: p.img!,
                            title: isUrdu ? `خریداری سونا (${p.name})` : `Gold Purchase (${p.name})`,
                            phone: p.phone,
                            name: p.name,
                            caption: `*${APP_CONFIG.shopNameUrdu}: خریداری سونا تصویر*\nبیچنے والا: ${p.name}\nوزن: ${p.weight}g\nریٹ: ${p.rate.toLocaleString()}\nکل رقم: Rs. ${p.total.toLocaleString()}\nشکریہ!`
                          })}
                          className="p-2 bg-sky-50 text-sky-600 hover:bg-sky-600 hover:text-white rounded-lg transition-colors border border-sky-200"
                          title={lang === 'ur' ? 'تصویر دیکھیں' : 'View Image'}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setWhatsappModalData({
                            img: p.img!,
                            phone: p.phone,
                            name: p.name,
                            caption: `*${APP_CONFIG.shopNameUrdu}: خریداری سونا تصویر*\nبیچنے والا: ${p.name}\nوزن: ${p.weight}g\nریٹ: ${p.rate.toLocaleString()}\nکل رقم: Rs. ${p.total.toLocaleString()}\nشکریہ!`,
                            title: isUrdu ? `خریداری سونا (${p.name})` : `Gold Purchase (${p.name})`
                          })}
                          className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors border border-emerald-700/20 shadow-xs flex items-center justify-center"
                          title={lang === 'ur' ? 'محفوظ شدہ تصویر واٹس ایپ کریں' : 'Send saved picture via WhatsApp'}
                        >
                          <Camera size={16} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        if (p.id) {
                          setPrintData({ data: p, id: p.id, type: 'purchase' });
                          setShowPrintPreview(true);
                          setTimeout(async () => {
                            const url = await generatePDF(p, p.id!, 'purchase');
                      if (url) {
                        setPdfUrl(url);
                      } else {
                        setShowPrintPreview(false);
                        alert('PDF generation failed. Please try again or check the image format.');
                      }
                          }, 400);
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-2 p-2 bg-sky-50 text-gold-dark rounded-lg hover:bg-gold hover:text-black transition-colors border border-gold-20"
                    >
                      <Printer size={16} />
                      <span className="text-xs font-bold urdu-text">{t.print}</span>
                    </button>
                    <button
                      onClick={() => sharePurchaseWhatsApp(p)}
                      className="p-2 bg-green-600-10 text-green-600 hover:bg-green-600 hover:text-white rounded-lg transition-colors border border-green-600-20"
                    >
                      <MessageCircle size={16} />
                    </button>
                    <button
                      onClick={() => p.id && setDeleteId({ id: p.id, type: 'purchase' })}
                      className="p-2 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-colors border border-red-200"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {purchases?.length === 0 && <EmptyState lang={lang} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ lang }: { lang: Language }) {
  return (
    <div className="col-span-full py-24 text-center space-y-4">
      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto text-sky-200 shadow-sm border border-sky-100">
        <History size={40} />
      </div>
      <div className="space-y-1">
        <h3 className="text-xl font-bold text-zinc-600 urdu-text">{lang === 'ur' ? 'کوئی ریکارڈ نہیں ملا' : 'No records found'}</h3>
        <p className="text-zinc-500 text-xs uppercase tracking-widest">{lang === 'ur' ? 'اپنی تلاش تبدیل کریں' : 'Try adjusting your search'}</p>
      </div>
    </div>
  );
}

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
