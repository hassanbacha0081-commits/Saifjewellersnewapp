import React, { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Order, type OrderPayment } from '../db';
import { translations, type Language } from '../translations';
import { formatCurrency, formatDate, formatWhatsAppUrl, compressImage } from '../lib/utils';
import { Plus, Check, Trash2, Camera, RotateCcw, MessageCircle, Printer, X, Download, AlertCircle, Image as ImageIcon, Scale, Sparkles, Hammer, Eye, EyeOff, Filter, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useReactToPrint } from 'react-to-print';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PrintReceipt } from './PrintReceipt';
import { MultiSelectInput } from './MultiSelectInput';
import { ConfirmModal } from './ConfirmModal';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { Printer as CapPrinter } from '@capgo/capacitor-printer';

import { APP_CONFIG } from '../config';

interface OrdersProps {
  lang: Language;
}

import ImageLightbox from './ImageLightbox';
import WhatsAppShareModal, { type WhatsAppShareData } from './WhatsAppShareModal';

export default function Orders({ lang }: OrdersProps) {
  const t = translations[lang];
  const [isAdding, setIsAdding] = useState(false);
  const [currentImg, setCurrentImg] = useState<string | null>(null);
  const [lightboxData, setLightboxData] = useState<{ img: string; title?: string; phone?: string; name?: string; caption?: string } | null>(null);
  const [whatsappModalData, setWhatsappModalData] = useState<WhatsAppShareData | null>(null);
  const [editingPayments, setEditingPayments] = useState<OrderPayment[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showSummary, setShowSummary] = useState(true);
  const [showOrderStatusOnBill, setShowOrderStatusOnBill] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    date: new Date().toISOString().split('T')[0],
    due: '',
    item: '',
    measurements: '',
    pricePerTola: '',
    karigar: '',
    oldWt: '',
    readyWt: '',
    total: 0,
    recAmt: 0,
    status: 'pending',
    makingCharges: '',
    weightPolish: '',
    totalWt: '',
    izafiWt: '',
    goldAmount: 0,
    mazdori: 0,
    oldGoldMinus: 0
  });

  const [printData, setPrintData] = useState<{ data: Order, id: number } | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Order_${printData?.id || 'new'}`,
    onAfterPrint: () => {
      setIsPrinting(false);
    }
  });

  const executePrint = async () => {
    if (Capacitor.isNativePlatform() && pdfUrl) {
      try {
        const base64Data = pdfUrl.split(',')[1];
        await CapPrinter.printBase64({
          name: `Order_${printData?.id || 'new'}`,
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

  const generatePDF = async (data: Order, id: number): Promise<string | null> => {
    if (!printRef.current) return null;
    setIsPrinting(true);
    try {
      window.scrollTo(0, 0);
      
      const canvas = await html2canvas(printRef.current, {
        scale: 3.0, // 1.0x avoids sub-pixel scaling calculations and is faster
        useCORS: true, // Disable CORS to avoid hanging on stylesheet downloads/fonts
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: false,
        imageTimeout: 2000, // No timeout latency for image rendering
        windowWidth: 800, // Explicitly set viewport width to prevent narrow responsive wrapping
        onclone: (clonedDoc) => {
          clonedDoc.body.style.margin = '0';
          clonedDoc.body.style.padding = '0';
          clonedDoc.body.style.backgroundColor = '#ffffff';
          clonedDoc.body.style.width = '800px';
          const el = clonedDoc.querySelector('.print-receipt-container') as HTMLElement;
          if (el) {
            clonedDoc.body.innerHTML = '';
            clonedDoc.body.appendChild(el);
            el.style.margin = '0';
            el.style.padding = '0.8cm';
            el.style.width = '800px';
            el.style.minHeight = '1135px';
            el.style.height = 'auto';
            el.style.display = 'block';
            el.style.position = 'relative';
          }
        }
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.8); // JPEG encoding is significantly faster than PNG

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const pdfWidth = 14.8;
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
        const fileName = `Order_${printData?.id || Date.now()}.pdf`;
        const base64Data = pdfUrl.split(',')[1];

        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
        });

        await Share.share({
          title: 'Order Receipt',
          url: savedFile.uri,
        });
      } catch (e) {
        console.error('Error sharing PDF', e);
        alert(lang === 'ur' ? "فائل شیئر کرنے میں خرابی پیش آئی" : "Error sharing file");
      }
    } else {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `Order_${printData?.id || 'new'}.pdf`;
      link.click();
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [qistOrderId, setQistOrderId] = useState<number | null>(null);
  const [qistAmount, setQistAmount] = useState<string>('');
  const [selectedOrderForQist, setSelectedOrderForQist] = useState<Order | null>(null);
  const [deleteQistIndex, setDeleteQistIndex] = useState<number | null>(null);

  const rawOrders = useLiveQuery(() => {
    if (!db.orders) return Promise.resolve([]);
    if (!searchTerm) return db.orders.orderBy('id').reverse().toArray();
    
    const term = searchTerm.toLowerCase();
    return db.orders
      .filter(o => 
        o.name.toLowerCase().includes(term) || 
        o.phone.includes(searchTerm) ||
        o.karigar.toLowerCase().includes(term) ||
        o.id?.toString() === searchTerm
      )
      .reverse()
      .toArray();
  }, [searchTerm]);

  const allOrdersCount = rawOrders?.length || 0;
  const baqayaCount = rawOrders?.filter(o => o.rem > 0).length || 0;
  const clearCount = rawOrders?.filter(o => o.rem <= 0).length || 0;
  const pendingCount = rawOrders?.filter(o => (o.status || '').toLowerCase() === 'pending').length || 0;
  const progressCount = rawOrders?.filter(o => ['progress', 'in progress', 'in_progress'].includes((o.status || '').toLowerCase())).length || 0;
  const completeCount = rawOrders?.filter(o => ['complete', 'completed'].includes((o.status || '').toLowerCase())).length || 0;
  const deliveredCount = rawOrders?.filter(o => (o.status || '').toLowerCase() === 'delivered').length || 0;

  const orders = (rawOrders || []).filter(o => {
    if (filterStatus === 'baqaya') return o.rem > 0;
    if (filterStatus === 'clear') return o.rem <= 0;
    if (filterStatus === 'pending') return (o.status || '').toLowerCase() === 'pending';
    if (filterStatus === 'progress') return ['progress', 'in progress', 'in_progress'].includes((o.status || '').toLowerCase());
    if (filterStatus === 'complete') return ['complete', 'completed'].includes((o.status || '').toLowerCase());
    if (filterStatus === 'delivered') return (o.status || '').toLowerCase() === 'delivered';
    return true;
  });

  const ordersTotals = (orders || []).reduce((acc, o) => {
    const wt = parseFloat(o.totalWt || o.readyWt || '0') || 0;
    const polish = parseFloat(o.makingCharges || o.weightPolish || '0') || 0;
    const mazdori = Number(o.mazdori) || 0;

    acc.weight += wt;
    acc.polish += polish;
    acc.mazdori += mazdori;
    acc.total += (o.total || 0);
    acc.rem += (o.rem || 0);
    return acc;
  }, { weight: 0, polish: 0, mazdori: 0, total: 0, rem: 0 });

  const updateRem = () => {
    const total = (Number(formData.goldAmount) || 0) + (Number(formData.mazdori) || 0);
    const oldGoldMinus = Number(formData.oldGoldMinus) || 0;
    if (editId) {
      const otherPaymentsSum = editingPayments.slice(1).reduce((sum, p) => sum + p.amt, 0);
      return total - oldGoldMinus - (Number(formData.recAmt) || 0) - otherPaymentsSum;
    } else {
      return total - oldGoldMinus - (Number(formData.recAmt) || 0);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const compressed = await compressImage(base64);
        setCurrentImg(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!formData.name) return alert(lang === 'ur' ? "نام ضروری ہے!" : "Name is required!");
    
    let payments = editId ? (await db.orders.get(editId))?.payments || [] : [{ amt: formData.recAmt, date: formatDate(new Date(), 'ur-PK') }];
    
    if (editId && payments.length > 0) {
      payments[0] = { ...payments[0], amt: formData.recAmt };
    }
    
    const paymentsSum = payments.reduce((sum, p) => sum + p.amt, 0);
    const goldAmount = Number(formData.goldAmount) || 0;
    const mazdori = Number(formData.mazdori) || 0;
    const oldGoldMinus = Number(formData.oldGoldMinus) || 0;
    const calculatedTotal = goldAmount + mazdori;
    const rem = calculatedTotal - oldGoldMinus - paymentsSum;

    const order: Order = {
      name: formData.name,
      phone: formData.phone,
      date: formData.date,
      due: formData.due,
      item: formData.item,
      measurements: formData.measurements,
      pricePerTola: formData.pricePerTola,
      karigar: formData.karigar,
      oldWt: formData.oldWt ? parseFloat(Number(formData.oldWt).toFixed(2)).toString() : '',
      readyWt: formData.readyWt ? parseFloat(Number(formData.readyWt).toFixed(2)).toString() : '',
      total: calculatedTotal,
      payments: payments,
      rem: rem,
      status: formData.status,
      img: currentImg,
      makingCharges: formData.makingCharges ? parseFloat(Number(formData.makingCharges).toFixed(2)).toString() : '',
      weightPolish: formData.weightPolish,
      totalWt: formData.totalWt ? parseFloat(Number(formData.totalWt).toFixed(2)).toString() : '',
      izafiWt: formData.izafiWt ? parseFloat(Number(formData.izafiWt).toFixed(2)).toString() : '',
      goldAmount: goldAmount,
      mazdori: mazdori,
      oldGoldMinus: oldGoldMinus
    };

    let id;
    if (editId) {
      await db.orders.put({ ...order, id: editId });
      id = editId;
    } else {
      id = await db.orders.add(order);
    }

    setPrintData({ data: order, id: id as number });
    setShowPrintPreview(true);
    
    // Generate PDF for preview faster with 100ms timeout
    setTimeout(async () => {
      const url = await generatePDF(order, id as number);
                      if (url) {
                        setPdfUrl(url);
                      } else {
                        setShowPrintPreview(false);
                        alert('PDF generation failed. Please try again or check the image format.');
                      }
    }, 400);

    setIsAdding(false);
    setEditId(null);
    setCurrentImg(null);
    setEditingPayments([]);
    setFormData({
      name: '',
      phone: '',
      date: new Date().toISOString().split('T')[0],
      due: '',
      item: '',
      measurements: '',
      pricePerTola: '',
      karigar: '',
      oldWt: '',
      readyWt: '',
      total: 0,
      recAmt: 0,
      status: 'pending',
      makingCharges: '',
      weightPolish: '',
      totalWt: '',
      izafiWt: '',
      goldAmount: 0,
      mazdori: 0,
      oldGoldMinus: 0
    });
  };

  const handleEdit = (order: Order) => {
    setEditId(order.id!);
    setEditingPayments(order.payments || []);
    setFormData({
      name: order.name,
      phone: order.phone,
      date: order.date,
      due: order.due,
      item: order.item,
      measurements: order.measurements || '',
      pricePerTola: order.pricePerTola || '',
      karigar: order.karigar,
      oldWt: order.oldWt,
      readyWt: order.readyWt,
      total: order.total,
      recAmt: order.payments[0]?.amt || 0,
      status: order.status,
      makingCharges: order.makingCharges || '',
      weightPolish: order.weightPolish || '',
      totalWt: order.totalWt || '',
      izafiWt: order.izafiWt || '',
      goldAmount: order.goldAmount || 0,
      mazdori: order.mazdori || 0,
      oldGoldMinus: order.oldGoldMinus || 0
    });
    setCurrentImg(order.img || null);
    setIsAdding(true);
    window.scrollTo(0, 0);
  };

  const getStatusColor = (s: string) => {
    const status = (s || '').toLowerCase();
    if (status === 'complete' || status === 'completed') return '#166534';
    if (status === 'progress' || status === 'in progress' || status === 'in_progress') return '#1e40af';
    if (status === 'delivered') return '#6b21a8';
    return '#c2410c'; // pending
  };

  const getStatusLabel = (s: string, isUrdu = true) => {
    const status = (s || '').toLowerCase();
    if (status === 'complete' || status === 'completed') return isUrdu ? 'مکمل (تیار ہے)' : 'Completed';
    if (status === 'progress' || status === 'in progress' || status === 'in_progress') return isUrdu ? 'کام جاری ہے' : 'In Progress';
    if (status === 'delivered') return isUrdu ? 'حوالے کر دیا گیا' : 'Delivered';
    return isUrdu ? 'زیر التواء' : 'Pending';
  };

  const handleQuickStatusChange = async (orderId: number, newStatus: string) => {
    await db.orders.update(orderId, { status: newStatus });
  };

  const updateOrder = async (id: number) => {
    const order = await db.orders.get(id);
    if (order) {
      setSelectedOrderForQist(order);
      setQistOrderId(id);
      setQistAmount('');
    }
  };

  const handleQistSubmit = async () => {
    if (!qistOrderId || !qistAmount || !selectedOrderForQist) return;
    const amt = parseFloat(qistAmount);
    if (isNaN(amt) || amt <= 0) {
      alert(lang === 'ur' ? "براہ کرم درست رقم درج کریں۔" : "Please enter a valid amount.");
      return;
    }
    
    const newPayments = [...(selectedOrderForQist.payments || []), { amt, date: formatDate(new Date(), 'ur-PK') }];
    const newRem = selectedOrderForQist.rem - amt;
    
    await db.orders.update(qistOrderId, { payments: newPayments, rem: newRem });
    setQistOrderId(null);
    setQistAmount('');
    setSelectedOrderForQist(null);
  };

  const handleDeleteQist = (indexToDelete: number) => {
    setDeleteQistIndex(indexToDelete);
  };

  const confirmDeleteQist = async (indexToDelete: number) => {
    if (!selectedOrderForQist || !qistOrderId) return;

    const paymentToDelete = selectedOrderForQist.payments[indexToDelete];
    const newPayments = selectedOrderForQist.payments.filter((_, i) => i !== indexToDelete);
    const newRem = selectedOrderForQist.rem + paymentToDelete.amt;

    await db.orders.update(qistOrderId, { payments: newPayments, rem: newRem });
    
    setSelectedOrderForQist({
      ...selectedOrderForQist,
      payments: newPayments,
      rem: newRem
    });
    setDeleteQistIndex(null);
  };

  const sendWS = (num: string, name: string, rem: number) => {
    const msg = `اسلام علیکم ${name}! ${APP_CONFIG.shopNameUrdu} سے آپ کا آرڈر تیار ہے۔ آپ کا بقایا ${rem} روپے ہے۔ شکریہ۔`;
    const url = formatWhatsAppUrl(num, msg);
    if (url) window.open(url, '_blank');
  };

  const handleDelete = async (id: number) => {
    await db.orders.delete(id);
    setDeleteId(null);
  };

  return (
    <div className="container mx-auto pb-20">
      <ConfirmModal 
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title={lang === 'ur' ? 'ڈیلیٹ کریں؟' : 'Confirm Delete'}
        message={lang === 'ur' ? 'کیا آپ واقعی اس آرڈر کو حذف کرنا چاہتے ہیں؟' : 'Are you sure you want to delete this order?'}
        lang={lang}
      />

      <ConfirmModal 
        isOpen={deleteQistIndex !== null}
        onClose={() => setDeleteQistIndex(null)}
        onConfirm={() => {
          if (deleteQistIndex !== null) {
            confirmDeleteQist(deleteQistIndex);
          }
        }}
        title={lang === 'ur' ? 'قسط ڈیلیٹ کریں؟' : 'Delete Installment?'}
        message={lang === 'ur' ? 'کیا آپ واقعی اس قسط کو حذف کرنا چاہتے ہیں؟' : 'Are you sure you want to delete this installment?'}
        lang={lang}
      />

      {/* Qist Modal */}
      <AnimatePresence>
        {qistOrderId !== null && selectedOrderForQist && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black-80 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-sky-200"
            >
              <div className="p-4 border-b border-sky-100 bg-sky-50 flex justify-between items-center">
                <h3 className="text-xl font-bold urdu-text text-gold-dark">قسط کی وصولی (Installment)</h3>
                <button onClick={() => setQistOrderId(null)} className="text-zinc-500 hover:text-gold-dark">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="bg-sky-50 p-4 rounded-xl border border-sky-100">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-500 urdu-text">کسٹمر:</span>
                    <span className="font-bold text-zinc-900">{selectedOrderForQist.name}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-500 urdu-text">کل رقم:</span>
                    <span className="font-bold text-zinc-900">{formatCurrency(selectedOrderForQist.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 urdu-text font-bold text-red-600">باقی رقم:</span>
                    <span className="font-bold text-red-600">{formatCurrency(selectedOrderForQist.rem)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-600 urdu-text">نئی وصول شدہ رقم:</label>
                  <input 
                    type="number" 
                    autoFocus
                    value={qistAmount}
                    onChange={e => setQistAmount(e.target.value)}
                    className="w-full p-4 bg-white border-2 border-sky-200 rounded-xl outline-none focus:border-gold text-2xl font-bold text-center text-black"
                  />
                </div>

                {selectedOrderForQist.payments && selectedOrderForQist.payments.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider urdu-text">ادائیگیوں کی تاریخ:</label>
                    <div className="max-h-32 overflow-y-auto space-y-2 pr-2">
                      {selectedOrderForQist.payments.map((p, i) => (
                        <div key={i} className="flex justify-between items-center text-xs p-2 bg-sky-50 rounded-lg border border-sky-100 group">
                          <span className="text-zinc-500">{p.date}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-green-600">{formatCurrency(p.amt)}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteQist(i)}
                              className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                              title={lang === 'ur' ? 'حذف کریں' : 'Delete'}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-sky-50 border-t border-sky-100 flex gap-3">
                <button 
                  onClick={() => setQistOrderId(null)}
                  className="flex-1 py-3 px-4 bg-white border border-sky-200 text-zinc-500 font-bold rounded-xl hover:bg-sky-100 transition-all urdu-text"
                >
                  کینسل
                </button>
                <button 
                  onClick={handleQistSubmit}
                  disabled={!qistAmount}
                  className="flex-[2] py-3 px-4 bg-gold text-black font-bold rounded-xl hover:bg-gold-light transition-all shadow-lg shadow-gold-20 urdu-text disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  محفوظ کریں
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Print Preview Modal */}
      {showPrintPreview && printData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black-80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex flex-wrap justify-between items-center gap-3 bg-zinc-50">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-xl font-bold urdu-text text-black">پرنٹ پریویو (Print Preview)</h3>
                
                {/* Option to show the status of order in the printed bill table */}
                <label className="flex items-center gap-2 px-3 py-1.5 bg-white border border-sky-300 rounded-xl text-xs font-bold text-sky-900 cursor-pointer hover:bg-sky-50 transition-colors shadow-xs urdu-text select-none">
                  <input
                    type="checkbox"
                    checked={showOrderStatusOnBill}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setShowOrderStatusOnBill(val);
                      if (printData) {
                        setPdfUrl(null);
                        setTimeout(async () => {
                          const url = await generatePDF(printData.data, printData.id);
                          if (url) setPdfUrl(url);
                        }, 250);
                      }
                    }}
                    className="w-4 h-4 text-gold rounded focus:ring-gold"
                  />
                  <span>{lang === 'ur' ? 'پرنٹ بل میں آرڈر کا اسٹیٹس دکھائیں' : 'Show Status on Bill Table'}</span>
                </label>
              </div>

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
                  type="order" 
                  data={printData.data} 
                  id={printData.id} 
                  showOrderStatus={showOrderStatusOnBill}
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
                className="flex-[2] min-w-[200px] bg-sky-600 hover:bg-sky-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-lg shadow-lg"
              >
                <Printer size={24} />
                <span className="urdu-text text-xl">پرنٹ کریں (Print)</span>
              </button>

              <button 
                type="button"
                disabled={!pdfUrl}
                onClick={downloadPDF}
                className="flex-1 min-w-[150px] bg-gold-600 bg-gold hover:bg-gold-light text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                <Download size={24} />
                <span className="urdu-text text-xl">PDFاؤن لوڈ</span>
              </button>

              <button 
                type="button"
                onClick={() => {
                  setShowPrintPreview(false);
                  setPrintData(null);
                  setPdfUrl(null);
                }}
                className="flex-1 min-w-[100px] bg-zinc-100 text-zinc-600 font-bold py-4 rounded-xl hover:bg-zinc-200 transition-all urdu-text text-xl"
              >
                بند کریں
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gold-dark urdu-text">{t.orders}</h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-gold text-black font-bold px-6 py-3 rounded-xl hover:bg-gold-light transition-all shadow-lg shadow-gold-20"
        >
          <Plus size={20} />
          <span className="urdu-text">{isAdding ? t.cancel : t.add}</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-gold mb-6 animate-in fade-in slide-in-from-top-4 duration-300 border border-sky-200">
          <h3 className="text-xl font-bold mb-4 urdu-text text-gold-dark"><i className="fas fa-gem"></i> نیا آرڈر بکنگ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 urdu-text">نام کسٹمر:</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 bg-white border border-sky-200 rounded-lg outline-none focus:border-gold text-black"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 urdu-text">فون نمبر:</label>
              <input 
                type="number" 
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-3 bg-white border border-sky-200 rounded-lg outline-none focus:border-gold text-black"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 urdu-text">تاریخ بکنگ:</label>
              <input 
                type="date" 
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full p-3 bg-white border border-sky-200 rounded-lg outline-none focus:border-gold text-black"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 urdu-text">ڈیلیوری تاریخ:</label>
              <input 
                type="date" 
                value={formData.due}
                onChange={e => setFormData({ ...formData, due: e.target.value })}
                className="w-full p-3 bg-white border border-sky-200 rounded-lg outline-none focus:border-gold text-black"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 urdu-text">نام آئٹم:</label>
              <MultiSelectInput 
                options={t.itemDetailsList}
                value={formData.item}
                onChange={val => setFormData({ ...formData, item: val })}
                lang={lang}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 urdu-text">{(t as any).measurements || 'پیمائش (Measurements)'}:</label>
              <input 
                type="text" 
                value={formData.measurements || ''}
                onChange={e => setFormData({ ...formData, measurements: e.target.value })}
                className="w-full p-3 bg-white border border-sky-200 rounded-lg outline-none focus:border-gold text-black"
                placeholder={lang === 'ur' ? "مثلاً چوڑی کا سائز، انگوٹھی کا سائز..." : "e.g. Bangle size, Ring size..."}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 urdu-text">{(t as any).pricePerTola || 'فی تولہ ریٹ (Price per Tola)'}:</label>
              <input 
                type="text" 
                value={formData.pricePerTola || ''}
                onChange={e => setFormData({ ...formData, pricePerTola: e.target.value })}
                className="w-full p-3 bg-white border border-sky-200 rounded-lg outline-none focus:border-gold text-black"
                placeholder={lang === 'ur' ? "مثلاً 240,000..." : "e.g. 240,000..."}
              />
            </div>
            <div className="col-span-1 md:col-span-2 border-t pt-4 mt-2">
              <h4 className="font-bold text-sm text-sky-900 urdu-text flex items-center gap-1.5 uppercase tracking-wide">
                <span className="w-1.5 h-3.5 bg-gold rounded-full inline-block"></span>
                {lang === 'ur' ? 'وزن (Weight)' : 'Weight'}
              </h4>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 urdu-text">{lang === 'ur' ? 'پرانا وزن (g):' : 'Old Gold Weight (g):'}</label>
              <input 
                type="number" 
                step="any"
                value={formData.oldWt || ''}
                onChange={e => {
                  const val = e.target.value;
                  const total = parseFloat(formData.totalWt) || 0;
                  const old = parseFloat(val) || 0;
                  const izafiWt = val ? parseFloat((total - old).toFixed(2)).toString() : '';
                  setFormData({ ...formData, oldWt: val, izafiWt });
                }}
                className="w-full p-3 bg-white border border-sky-200 rounded-lg outline-none focus:border-gold text-black"
                placeholder="e.g. 1.50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 urdu-text">{lang === 'ur' ? 'وزن (g):' : 'Weight (g):'}</label>
              <input 
                type="number" 
                step="any"
                value={formData.readyWt || ''}
                onChange={e => {
                  const val = e.target.value;
                  const ready = parseFloat(val) || 0;
                  const polish = parseFloat(formData.makingCharges) || 0;
                  const calculatedTotal = (ready + polish) > 0 ? parseFloat((ready + polish).toFixed(2)).toString() : '';
                  
                  const old = parseFloat(formData.oldWt) || 0;
                  const izafiWt = formData.oldWt ? parseFloat(((parseFloat(calculatedTotal) || 0) - old).toFixed(2)).toString() : '';

                  setFormData({ 
                    ...formData, 
                    readyWt: val,
                    totalWt: calculatedTotal,
                    izafiWt
                  });
                }}
                className="w-full p-3 bg-white border border-sky-200 rounded-lg outline-none focus:border-gold text-black"
                placeholder="e.g. 5.20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 urdu-text">{lang === 'ur' ? 'پالش:' : 'Polish:'}</label>
              <input 
                type="number" 
                step="any"
                value={formData.makingCharges || ''}
                onChange={e => {
                  const val = e.target.value;
                  const ready = parseFloat(formData.readyWt) || 0;
                  const polish = parseFloat(val) || 0;
                  const calculatedTotal = (ready + polish) > 0 ? parseFloat((ready + polish).toFixed(2)).toString() : '';
                  
                  const old = parseFloat(formData.oldWt) || 0;
                  const izafiWt = formData.oldWt ? parseFloat(((parseFloat(calculatedTotal) || 0) - old).toFixed(2)).toString() : '';

                  setFormData({ 
                    ...formData, 
                    makingCharges: val,
                    totalWt: calculatedTotal,
                    izafiWt
                  });
                }}
                className="w-full p-3 bg-white border border-sky-200 rounded-lg outline-none focus:border-gold text-black"
                placeholder={lang === 'ur' ? "مثلاً 1.50..." : "e.g. 1.50..."}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 urdu-text">{lang === 'ur' ? 'ٹوٹل وزن (g):' : 'Total Weight (g):'}</label>
              <input 
                type="number" 
                step="any"
                value={formData.totalWt || ''}
                onChange={e => {
                  const val = e.target.value;
                  const total = parseFloat(val) || 0;
                  const old = parseFloat(formData.oldWt) || 0;
                  const izafiWt = formData.oldWt ? parseFloat((total - old).toFixed(2)).toString() : '';
                  
                  setFormData({ ...formData, totalWt: val, izafiWt });
                }}
                className="w-full p-3 bg-white border border-sky-200 rounded-lg outline-none focus:border-gold text-black"
                placeholder="e.g. 6.70"
              />
            </div>
            {formData.oldWt && (
              <div className="space-y-1">
                <label className="text-xs text-zinc-500 urdu-text">{lang === 'ur' ? 'اضافی وزن (g):' : 'Azafi Weight (g):'}</label>
                <input 
                  type="number" 
                  step="any"
                  value={formData.izafiWt || ''}
                  onChange={e => setFormData({ ...formData, izafiWt: e.target.value })}
                  className="w-full p-3 bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-600 font-extrabold cursor-not-allowed"
                  placeholder="Calculated automatically"
                  disabled
                />
              </div>
            )}

            {/* Picture Upload / Camera Capture in sequence, spanning 2 cols */}
            <div className="col-span-1 md:col-span-2 space-y-1 mt-2">
              <label className="text-xs text-zinc-500 urdu-text font-bold">{lang === 'ur' ? 'آرڈر کی تصویر (Order Pic):' : 'Order Pic:'}</label>
              {currentImg ? (
                <div 
                  className="relative group cursor-pointer max-w-sm mx-auto" 
                  onClick={() => setLightboxData({
                    img: currentImg,
                    title: lang === 'ur' ? 'آرڈر کی تصویر' : 'Order Image',
                    phone: formData.phone,
                    name: formData.name
                  })}
                >
                  <img src={currentImg} alt="Preview" className="w-full h-40 object-contain border border-sky-200 rounded-lg group-hover:opacity-95 transition-opacity" />
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setCurrentImg(null); }}
                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full z-10 hover:bg-red-700 transition-colors"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              ) : (
                <div className="max-w-sm mx-auto grid grid-cols-2 gap-3">
                  <div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                      id="ordersCameraInput"
                    />
                    <label 
                      htmlFor="ordersCameraInput"
                      className="w-full p-3 border-2 border-dashed border-sky-200 rounded-lg text-zinc-500 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-gold hover:text-gold transition-all text-center min-h-[60px]"
                    >
                      <Camera size={16} />
                      <span className="urdu-text text-xs">{lang === 'ur' ? 'کیمرہ' : 'Camera'}</span>
                    </label>
                  </div>

                  <div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange}
                      className="hidden"
                      id="ordersGalleryInput"
                    />
                    <label 
                      htmlFor="ordersGalleryInput"
                      className="w-full p-3 border-2 border-dashed border-sky-200 rounded-lg text-zinc-500 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-gold hover:text-gold transition-all text-center min-h-[60px]"
                    >
                      <ImageIcon size={16} />
                      <span className="urdu-text text-xs">{lang === 'ur' ? 'گیلری' : 'Gallery'}</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-500 urdu-text">نام کاریگر:</label>
              <input 
                type="text" 
                value={formData.karigar}
                onChange={e => setFormData({ ...formData, karigar: e.target.value })}
                className="w-full p-3 bg-white border border-sky-200 rounded-lg outline-none focus:border-gold text-black"
                placeholder="e.g. Aslam"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 urdu-text">{lang === 'ur' ? 'سونے کی رقم (Gold Amount):' : 'Gold Amount:'}</label>
              <input 
                type="number" 
                value={formData.goldAmount || ''}
                onChange={e => {
                  const val = Number(e.target.value) || 0;
                  setFormData(prev => ({
                    ...prev,
                    goldAmount: val,
                    total: val + (prev.mazdori || 0)
                  }));
                }}
                className="w-full p-3 bg-white border border-sky-200 rounded-lg outline-none focus:border-gold text-black font-bold"
                placeholder="e.g. 40,000"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 urdu-text">{lang === 'ur' ? 'مزدوری (Mazdori):' : 'Mazdori:'}</label>
              <input 
                type="number" 
                value={formData.mazdori || ''}
                onChange={e => {
                  const val = Number(e.target.value) || 0;
                  setFormData(prev => ({
                    ...prev,
                    mazdori: val,
                    total: (prev.goldAmount || 0) + val
                  }));
                }}
                className="w-full p-3 bg-white border border-sky-200 rounded-lg outline-none focus:border-gold text-black font-bold"
                placeholder="e.g. 5,000"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 urdu-text font-bold">{lang === 'ur' ? 'کل رقم (Total Amount):' : 'Total Amount:'}</label>
              <input 
                type="number" 
                value={((Number(formData.goldAmount) || 0) + (Number(formData.mazdori) || 0)) || ''}
                disabled
                className="w-full p-3 bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-600 font-extrabold cursor-not-allowed"
                placeholder="Calculated automatically"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 urdu-text">{lang === 'ur' ? 'پرانا سونا منہا (Old Gold Minus):' : 'Old Gold Minus:'}</label>
              <input 
                type="number" 
                value={formData.oldGoldMinus || ''}
                onChange={e => setFormData({ ...formData, oldGoldMinus: Number(e.target.value) || 0 })}
                className="w-full p-3 bg-white border border-sky-200 rounded-lg outline-none focus:border-gold text-black font-bold"
                placeholder="e.g. 10,000"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 urdu-text">{lang === 'ur' ? 'وصول شدہ رقم / ایڈوانس (Advance):' : 'Advance Amount:'}</label>
              <input 
                type="number" 
                value={formData.recAmt || ''}
                onChange={e => setFormData({ ...formData, recAmt: Number(e.target.value) || 0 })}
                className="w-full p-3 bg-white border border-sky-200 rounded-lg outline-none focus:border-gold text-black font-bold"
                placeholder="e.g. 10,000"
              />
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-sky-50 rounded-xl border border-gold-20 flex justify-between items-center shadow-inner">
            <span className="text-zinc-600 urdu-text font-bold">{lang === 'ur' ? 'صاف بقایا:' : 'Net Remaining:'}</span>
            <span className="text-2xl font-black text-gold-dark">Rs. {updateRem().toLocaleString()}</span>
          </div>

          <select 
            value={formData.status}
            onChange={e => setFormData({ ...formData, status: e.target.value })}
            className="w-full p-3 bg-white border border-sky-200 rounded-lg outline-none focus:border-gold mt-4 text-black"
          >
            <option value="pending">Pending (انتظار)</option>
            <option value="progress">In Progress (کام جاری)</option>
            <option value="complete">Complete (تیار ہے)</option>
            <option value="delivered">Delivered (حوالے کر دیا)</option>
          </select>

          <button 
            onClick={handleSave}
            className="w-full p-4 bg-gold text-black font-bold rounded-lg shadow-lg shadow-gold-20 mt-6 urdu-text"
          >
            آرڈر محفوظ کریں
          </button>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div className="relative w-full">
          <input 
            type="text" 
            className="w-full pl-10 pr-10 py-3.5 bg-white border border-sky-200 rounded-xl outline-none focus:border-gold shadow-sm text-black"
            placeholder={lang === 'ur' ? 'آرڈرز تلاش کریں (نام، فون، کاریگر، آئٹم)...' : 'Search orders (name, phone, karigar, item)...'}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
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

        {/* Filter bar for Baqaya / Clear and order status */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-zinc-500 urdu-text flex items-center gap-1">
              <Filter size={14} className="text-gold-dark" />
              {lang === 'ur' ? 'آرڈر فلٹر:' : 'Filter:'}
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
              <span>{lang === 'ur' ? 'تمام' : 'All'}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterStatus === 'all' ? 'bg-gold/20 text-gold' : 'bg-zinc-100 text-zinc-600'}`}>
                {allOrdersCount}
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
              <span>{lang === 'ur' ? 'بقایا دار' : 'Baqaya'}</span>
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
              <span>{lang === 'ur' ? 'صاف (کلیئر)' : 'Clear'}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterStatus === 'clear' ? 'bg-emerald-900 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                {clearCount}
              </span>
            </button>

            {/* Quick status dropdown */}
            <select
              value={['all', 'baqaya', 'clear'].includes(filterStatus) ? '' : filterStatus}
              onChange={(e) => {
                if (e.target.value) setFilterStatus(e.target.value);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white text-zinc-700 border border-sky-200 outline-none focus:ring-1 focus:ring-gold urdu-text"
            >
              <option value="">{lang === 'ur' ? 'اسٹیٹس فلٹر...' : 'Filter by Status...'}</option>
              <option value="pending">Pending (زیر التواء: {pendingCount})</option>
              <option value="progress">In Progress (کام جاری: {progressCount})</option>
              <option value="complete">Completed (مکمل: {completeCount})</option>
              <option value="delivered">Delivered (حوالے کر دیا: {deliveredCount})</option>
            </select>
          </div>

          {/* Option toggle for totals summary */}
          <button
            type="button"
            onClick={() => setShowSummary(prev => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all urdu-text shadow-sm"
          >
            {showSummary ? <EyeOff size={15} className="text-amber-700" /> : <Eye size={15} className="text-amber-700" />}
            <span>
              {showSummary 
                ? (lang === 'ur' ? 'خلاصہ چھپائیں' : 'Hide Totals')
                : (lang === 'ur' ? 'مجموعی خلاصہ دیکھیں (وزن، پالش، مزدوری)' : 'Show Totals (Weight, Polish, Mazdori)')}
            </span>
          </button>
        </div>

        {/* Totals Summary Cards for Orders */}
        {showSummary && (
          <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-sky-950 text-white p-5 rounded-2xl shadow-lg border border-gold/30">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-sky-700/60">
              <div className="flex items-center gap-2">
                <Scale className="text-gold" size={20} />
                <h3 className="text-base font-bold text-gold urdu-text">
                  {lang === 'ur' ? 'مجموعی آرڈرز خلاصہ (کل وزن، کل پالش اور کل مزدوری)' : 'Orders Totals Summary (Weight, Polish & Mazdori)'}
                </h3>
              </div>
              <span className="text-xs text-sky-200 urdu-text font-mono">
                {lang === 'ur' ? `آرڈرز تعداد: ${orders.length}` : `Orders: ${orders.length}`}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between text-amber-300 text-xs mb-1">
                  <span className="urdu-text font-bold">{lang === 'ur' ? 'کل آرڈر وزن' : 'Total Order Wt'}</span>
                  <Scale size={16} />
                </div>
                <div className="text-2xl font-black font-mono text-white">
                  {ordersTotals.weight.toFixed(2)} <span className="text-xs font-normal text-amber-200">g</span>
                </div>
                <div className="text-[10px] text-sky-200 urdu-text mt-0.5">
                  {lang === 'ur' ? 'آرڈرز کا کل تیار/ٹوٹل وزن' : 'Total gold weight'}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between text-sky-300 text-xs mb-1">
                  <span className="urdu-text font-bold">{lang === 'ur' ? 'کل پالش' : 'Total Polish'}</span>
                  <Sparkles size={16} />
                </div>
                <div className="text-2xl font-black font-mono text-white">
                  {ordersTotals.polish.toFixed(2)} <span className="text-xs font-normal text-sky-200">g</span>
                </div>
                <div className="text-[10px] text-sky-200 urdu-text mt-0.5">
                  {lang === 'ur' ? 'پالش کا مجموعی وزن' : 'Total polish weight'}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between text-emerald-300 text-xs mb-1">
                  <span className="urdu-text font-bold">{lang === 'ur' ? 'کل مزدوری' : 'Total Mazdori'}</span>
                  <Hammer size={16} />
                </div>
                <div className="text-2xl font-black font-mono text-white">
                  Rs. {ordersTotals.mazdori.toLocaleString()}
                </div>
                <div className="text-[10px] text-sky-200 urdu-text mt-0.5">
                  {lang === 'ur' ? 'تمام آرڈرز کی مزدوری' : 'Total labor charges'}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between text-red-300 text-xs mb-1">
                  <span className="urdu-text font-bold">{lang === 'ur' ? 'کل بقایا' : 'Total Baqaya'}</span>
                  <AlertCircle size={16} />
                </div>
                <div className="text-2xl font-black font-mono text-white">
                  Rs. {ordersTotals.rem.toLocaleString()}
                </div>
                <div className="text-[10px] text-sky-200 urdu-text mt-0.5">
                  {lang === 'ur' ? 'آرڈرز کی غیر وصول شدہ رقم' : 'Pending balance'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders?.map((order) => {
          const isClear = order.rem <= 0;
          const orderWeight = parseFloat(order.totalWt || order.readyWt || '0') || 0;
          const orderPolish = parseFloat(order.makingCharges || order.weightPolish || '0') || 0;
          const orderMazdori = Number(order.mazdori) || 0;

          return (
          <div 
            key={order.id} 
            className={`bg-white p-5 rounded-xl border shadow-sm hover:shadow-md transition-all ${
              isClear ? 'border-emerald-200' : 'border-red-200'
            }`}
            style={{ 
              borderTop: `4px solid ${isClear ? '#10b981' : '#ef4444'}`,
              borderRight: `6px solid ${getStatusColor(order.status)}` 
            }}
          >
            <div className="flex justify-between items-start mb-3 gap-2">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 urdu-text">{order.name}</h3>
                <p className="text-sm text-zinc-500 font-mono" dir="ltr">{order.phone}</p>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                {/* Prominent Baqaya / Clear Label */}
                {isClear ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 urdu-text shadow-xs">
                    <Check size={13} className="stroke-[3] text-emerald-700" />
                    {lang === 'ur' ? 'صاف' : 'Clear'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-700 border border-red-300 urdu-text shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                    {lang === 'ur' ? 'بقایا' : 'Baqaya'}
                  </span>
                )}

                {/* Status Dropdown with Quick Change */}
                <select
                  value={(order.status || 'pending').toLowerCase()}
                  onChange={(e) => order.id && handleQuickStatusChange(order.id, e.target.value)}
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full border outline-none cursor-pointer urdu-text shadow-xs"
                  style={{
                    color: getStatusColor(order.status),
                    backgroundColor: `${getStatusColor(order.status)}15`,
                    borderColor: `${getStatusColor(order.status)}50`
                  }}
                  title={lang === 'ur' ? 'اسٹیٹس تبدیل کریں' : 'Change status'}
                >
                  <option value="pending">Pending (زیر التواء)</option>
                  <option value="progress">In Progress (کام جاری)</option>
                  <option value="complete">Completed (مکمل / تیار)</option>
                  <option value="delivered">Delivered (حوالے کر دیا)</option>
                </select>
              </div>
            </div>

            {/* Weight, Polish, Mazdori breakdown per order */}
            <div className="grid grid-cols-3 gap-1 p-2 bg-zinc-50 rounded-lg text-[11px] border border-zinc-200 font-mono mb-3">
              <div className="text-center">
                <span className="block text-[9px] text-zinc-500 font-sans urdu-text font-bold">{lang === 'ur' ? 'وزن' : 'Weight'}</span>
                <span className="font-bold text-zinc-800">{orderWeight.toFixed(2)}g</span>
              </div>
              <div className="text-center border-x border-zinc-200">
                <span className="block text-[9px] text-zinc-500 font-sans urdu-text font-bold">{lang === 'ur' ? 'پالش' : 'Polish'}</span>
                <span className="font-bold text-zinc-800">{orderPolish.toFixed(2)}g</span>
              </div>
              <div className="text-center">
                <span className="block text-[9px] text-zinc-500 font-sans urdu-text font-bold">{lang === 'ur' ? 'مزدوری' : 'Mazdori'}</span>
                <span className="font-bold text-zinc-800">Rs. {orderMazdori.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="space-y-2 mb-4 text-sm">
              <p className="text-zinc-600 line-clamp-2">{order.item}</p>
              {order.measurements && (
                <div className="flex justify-between text-sky-800 bg-sky-50 px-2 py-1 rounded-md border border-sky-100">
                  <span className="urdu-text text-xs">{(t as any).measurements || 'پیمائش'}:</span>
                  <span className="font-bold text-xs">{order.measurements}</span>
                </div>
              )}
              {order.pricePerTola && (
                <div className="flex justify-between text-zinc-800 bg-zinc-50 px-2 py-1 rounded-md border border-zinc-100">
                  <span className="urdu-text text-xs">{(t as any).pricePerTola || 'فی تولہ ریٹ'}:</span>
                  <span className="font-bold text-xs">{order.pricePerTola}</span>
                </div>
              )}
              {order.oldWt && (
                <div className="flex justify-between text-sky-800 bg-sky-50 px-2 py-1 rounded-md border border-sky-100">
                  <span className="urdu-text text-xs">{lang === 'ur' ? 'پرانا وزن:' : 'Old Gold Weight:'}</span>
                  <span className="font-bold text-xs">{order.oldWt}g</span>
                </div>
              )}
              {order.readyWt && (
                <div className="flex justify-between text-zinc-800 bg-zinc-50 px-2 py-1 rounded-md border border-zinc-100">
                  <span className="urdu-text text-xs">{lang === 'ur' ? 'وزن:' : 'Weight:'}</span>
                  <span className="font-bold text-xs">{order.readyWt}g</span>
                </div>
              )}
              {order.makingCharges && (
                <div className="flex justify-between text-amber-800 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                  <span className="urdu-text text-xs">{lang === 'ur' ? 'پالش:' : 'Polish:'}</span>
                  <span className="font-bold text-xs">{order.makingCharges}</span>
                </div>
              )}
              {order.totalWt && (
                <div className="flex justify-between text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                  <span className="urdu-text text-xs">{lang === 'ur' ? 'ٹوٹل وزن:' : 'Total Weight:'}</span>
                  <span className="font-bold text-xs">{order.totalWt}g</span>
                </div>
              )}
              {order.izafiWt && (
                <div className="flex justify-between text-purple-800 bg-purple-50 px-2 py-1 rounded-md border border-purple-100">
                  <span className="urdu-text text-xs">{lang === 'ur' ? 'اضافی وزن:' : 'Azafi Weight:'}</span>
                  <span className="font-bold text-xs">{order.izafiWt}g</span>
                </div>
              )}
              {order.img && (
                <div className="flex justify-between items-center text-sky-800 bg-sky-50 px-2.5 py-1.5 rounded-lg border border-sky-200">
                  <span className="urdu-text text-xs font-bold flex items-center gap-1.5 text-sky-900">
                    <Camera size={14} className="text-sky-600" />
                    {lang === 'ur' ? 'تصویر' : 'Image'}:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button 
                      type="button"
                      onClick={() => setLightboxData({
                        img: order.img!,
                        title: order.item ? `${order.item} (${order.name})` : (lang === 'ur' ? 'آرڈر کی تصویر' : 'Order Image'),
                        phone: order.phone,
                        name: order.name,
                        caption: `*${APP_CONFIG.shopNameUrdu}: آرڈر تصویر*\nگاہک: ${order.name}\nآئٹم: ${order.item}\nبقایا: Rs. ${order.rem.toLocaleString()}\nاسٹیٹس: ${getStatusLabel(order.status, lang === 'ur')}\nشکریہ!`
                      })}
                      className="p-1 px-2 bg-sky-200 hover:bg-sky-300 text-sky-800 rounded font-bold text-xs transition-colors flex items-center gap-1"
                      title={lang === 'ur' ? 'تصویر دیکھیں' : 'View'}
                    >
                      <Eye size={12} />
                      {lang === 'ur' ? 'دیکھیں' : 'View'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setWhatsappModalData({
                        img: order.img!,
                        phone: order.phone,
                        name: order.name,
                        caption: `*${APP_CONFIG.shopNameUrdu}: آرڈر تصویر*\nگاہک: ${order.name}\nآئٹم: ${order.item}\nبقایا: Rs. ${order.rem.toLocaleString()}\nاسٹیٹس: ${getStatusLabel(order.status, lang === 'ur')}\nشکریہ!`,
                        title: order.item ? `${order.item} (${order.name})` : (lang === 'ur' ? 'آرڈر کی تصویر' : 'Order Image')
                      })}
                      className="p-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs transition-colors flex items-center gap-1 shadow-xs"
                      title={lang === 'ur' ? 'محفوظ شدہ تصویر واٹس ایپ کریں' : 'Send image via WhatsApp'}
                    >
                      <MessageCircle size={12} />
                      <span>{lang === 'ur' ? 'تصویر واٹس ایپ' : 'WhatsApp Img'}</span>
                    </button>
                  </div>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-500 urdu-text">کاریگر:</span>
                <span className="font-bold text-zinc-700">{order.karigar}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 urdu-text">واپسی:</span>
                <span className="font-bold text-zinc-700">{order.due}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 urdu-text">بقایا:</span>
                <span className="font-bold text-red-600">{formatCurrency(order.rem)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-sky-100">
              <button 
                onClick={() => handleEdit(order)}
                className="flex-1 p-2 bg-sky-50 text-gold-dark rounded-lg hover:bg-gold hover:text-black transition-all text-xs font-bold urdu-text border border-sky-100"
              >
                ایڈٹ
              </button>
              <button 
                onClick={() => order.id && updateOrder(order.id)}
                className="flex-1 p-2 bg-sky-50 text-zinc-600 rounded-lg hover:bg-sky-100 transition-all text-xs font-bold urdu-text border border-sky-100"
              >
                قسط
              </button>
              <button 
                onClick={() => {
                  if (order.id) {
                    setPrintData({ data: order, id: order.id });
                    setShowPrintPreview(true);
                    setTimeout(async () => {
                      const url = await generatePDF(order, order.id!);
                      if (url) {
                        setPdfUrl(url);
                      } else {
                        setShowPrintPreview(false);
                        alert('PDF generation failed. Please try again or check the image format.');
                      }
                    }, 400);
                  }
                }}
                className="flex-1 p-2 bg-sky-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all text-xs font-bold urdu-text border border-sky-100"
              >
                رسید
              </button>
              <button 
                onClick={() => sendWS(order.phone, order.name, order.rem)}
                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                title={lang === 'ur' ? 'پیغام واٹس ایپ کریں' : 'Send message on WhatsApp'}
              >
                <MessageCircle size={18} />
              </button>
              {order.img && (
                <button 
                  type="button"
                  onClick={() => setWhatsappModalData({
                    img: order.img!,
                    phone: order.phone,
                    name: order.name,
                    caption: `*${APP_CONFIG.shopNameUrdu}: آرڈر تصویر*\nگاہک: ${order.name}\nآئٹم: ${order.item}\nبقایا: Rs. ${order.rem.toLocaleString()}\nاسٹیٹس: ${getStatusLabel(order.status, lang === 'ur')}\nشکریہ!`,
                    title: order.item ? `${order.item} (${order.name})` : (lang === 'ur' ? 'آرڈر کی تصویر' : 'Order Image')
                  })}
                  className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all flex items-center justify-center border border-emerald-700/20 shadow-xs"
                  title={lang === 'ur' ? 'محفوظ شدہ تصویر واٹس ایپ کریں' : 'Send saved picture via WhatsApp'}
                >
                  <Camera size={18} />
                </button>
              )}
              <button 
                onClick={() => order.id && setDeleteId(order.id)}
                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all border border-red-200"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        );
      })}
      </div>

      {lightboxData && (
        <ImageLightbox 
          src={lightboxData.img} 
          onClose={() => setLightboxData(null)} 
          title={lightboxData.title}
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
    </div>
  );
}
