import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Khaata, type KhaataAccount } from '../db';
import { translations, type Language } from '../translations';
import { formatDate, formatWhatsAppUrl } from '../lib/utils';
import { Plus, Check, Trash2, X, ChevronRight, ArrowLeft, Edit2, FileText, Share2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { Printer as CapPrinter } from '@capgo/capacitor-printer';
import { MultiSelectInput } from './MultiSelectInput';
import { ConfirmModal } from './ConfirmModal';

interface KhaataProps {
  lang: Language;
}

export function Khaata({ lang }: KhaataProps) {
  const t = translations[lang];
  
  // State
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [deleteAccountId, setDeleteAccountId] = useState<number | null>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<number | null>(null);
  
  // Account List View
  const accounts = useLiveQuery(() => db.khaataAccounts.orderBy('name').toArray());
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [accountFormData, setAccountFormData] = useState({ name: '', phone: '' });

  // Entries View
  const khaataRecords = useLiveQuery(
    async () => {
      if (!selectedAccountId) return [];
      const records = await db.khaata.where('accountId').equals(selectedAccountId).toArray();
      const sorted = records.sort((a, b) => (a.id || 0) - (b.id || 0));
      
      let runningBaqaya = 0;
      return sorted.map((record) => {
        const totalBaqaya = Number((runningBaqaya + (record.itemPasa || 0) - (record.pasaDia || 0)).toFixed(3));
        runningBaqaya = totalBaqaya;
        return {
          ...record,
          totalBaqaya
        };
      });
    },
    [selectedAccountId]
  );
  
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [editEntryId, setEditEntryId] = useState<number | null>(null);
  const [entryFormData, setEntryFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    itemDetail: '',
    pakaye: '',
    mixWazan: '',
    kaatInRati: '',
    itemPasa: '',
    pasaDia: '',
  });

  const selectedAccount = accounts?.find(a => a.id === selectedAccountId);

  // --- Account Handlers ---
  const handleSaveAccount = async () => {
    if (!accountFormData.name) return alert(lang === 'ur' ? "نام ضروری ہے!" : "Name is required!");
    await db.khaataAccounts.add({
      name: accountFormData.name,
      phone: accountFormData.phone,
      createdAt: new Date().toISOString()
    });
    setAccountFormData({ name: '', phone: '' });
    setIsAddingAccount(false);
  };

  const confirmDeleteAccount = async (id: number) => {
    await db.khaata.where('accountId').equals(id).delete();
    await db.khaataAccounts.delete(id);
    if (selectedAccountId === id) setSelectedAccountId(null);
    setDeleteAccountId(null);
  };

  // --- Entry Handlers ---
  const handleSaveEntry = async () => {
    if (!selectedAccountId) return;
    if (!entryFormData.itemDetail) return alert(lang === 'ur' ? "آئٹم کی تفصیل ضروری ہے!" : "Item detail is required!");

    const pakaye = Number(entryFormData.pakaye) || 0;
    const mixWazan = Number(entryFormData.mixWazan) || 0;
    const kaatInRati = Number(entryFormData.kaatInRati) || 0;
    const pasaDia = Number(entryFormData.pasaDia) || 0;
    
    // Auto-calculate Item Pasa if mixWazan is given, or fallback to user input
    let itemPasa = Number(entryFormData.itemPasa) || 0;
    if (mixWazan > 0) {
      itemPasa = Number(((mixWazan / 96) * (96 - kaatInRati)).toFixed(3));
    }
    
    // Calculate total baqaya based on previous entry
    let previousBaqaya = 0;
    if (khaataRecords) {
      if (editEntryId) {
        const idx = khaataRecords.findIndex(r => r.id === editEntryId);
        if (idx > 0) {
          previousBaqaya = khaataRecords[idx - 1].totalBaqaya;
        }
      } else if (khaataRecords.length > 0) {
        previousBaqaya = khaataRecords[khaataRecords.length - 1].totalBaqaya;
      }
    }
    const totalBaqaya = Number((previousBaqaya + itemPasa - pasaDia).toFixed(3));

    const record: Khaata = {
      accountId: selectedAccountId,
      date: entryFormData.date,
      itemDetail: entryFormData.itemDetail,
      pakaye,
      mixWazan,
      kaatInRati,
      itemPasa,
      pasaDia,
      totalBaqaya
    };

    if (editEntryId) {
      await db.khaata.update(editEntryId, record);
    } else {
      await db.khaata.add(record);
    }

    setEntryFormData({
      date: new Date().toISOString().split('T')[0],
      itemDetail: '',
      pakaye: '',
      mixWazan: '',
      kaatInRati: '',
      itemPasa: '',
      pasaDia: '',
    });
    setIsAddingEntry(false);
    setEditEntryId(null);
  };

  const handleEditEntry = (record: Khaata) => {
    setEditEntryId(record.id!);
    setEntryFormData({
      date: record.date,
      itemDetail: record.itemDetail,
      pakaye: record.pakaye.toString(),
      mixWazan: record.mixWazan.toString(),
      kaatInRati: record.kaatInRati.toString(),
      itemPasa: record.itemPasa.toString(),
      pasaDia: record.pasaDia.toString()
    });
    setIsAddingEntry(true);
  };

  const confirmDeleteEntry = async (id: number) => {
    await db.khaata.delete(id);
    setDeleteEntryId(null);
  };

  const handleWhatsAppShare = async () => {
    if (!selectedAccountId || !khaataRecords) return;
    const account = await db.khaataAccounts.get(selectedAccountId);
    if (!account) return;

    let text = `*Khaata Summary - ${account.name}*\n\n`;
    khaataRecords.forEach(record => {
      text += `Date: ${formatDate(record.date, 'en-US')}\n`;
      text += `Item: ${record.itemDetail}\n`;
      text += `Pakaye: ${record.pakaye}\n`;
      text += `Mix Wazan: ${record.mixWazan}\n`;
      text += `Kaat (Rati): ${record.kaatInRati}\n`;
      text += `Item Pasa: ${record.itemPasa}\n`;
      text += `Pasa Dia: ${record.pasaDia}\n`;
      text += `Total Baqaya: ${record.totalBaqaya}\n`;
      text += `------------------------\n`;
    });
    
    if (khaataRecords.length > 0) {
      text += `\n*Final Baqaya: ${khaataRecords[khaataRecords.length - 1].totalBaqaya}*`;
    }

    const url = formatWhatsAppUrl(account.phone, text);
    if (url) {
      window.open(url, '_blank');
    } else {
      // Fallback if no phone number
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const handlePrintPDF = async () => {
    if (!selectedAccountId || !khaataRecords) return;
    const account = await db.khaataAccounts.get(selectedAccountId);
    if (!account) return;

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(`Khaata Report: ${account.name}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Date Printed: ${new Date().toLocaleDateString()}`, 14, 30);
    
    const tableColumn = ["Date", "Item", "Pakaye", "Mix", "Kaat", "Item Pasa", "Pasa Dia", "Total Baqaya"];
    const tableRows = khaataRecords.map(record => [
      formatDate(record.date, 'en-US'),
      record.itemDetail,
      record.pakaye,
      record.mixWazan,
      record.kaatInRati,
      record.itemPasa,
      record.pasaDia,
      record.totalBaqaya
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [2, 132, 199] }, // sky-600
    });
    
    if (khaataRecords.length > 0) {
      // @ts-ignore - autoTable adds lastAutoTable to doc
      const finalY = doc.lastAutoTable.finalY || 40;
      doc.setFontSize(12);
      doc.setTextColor(220, 38, 38); // red-600
      doc.text(`Final Baqaya: ${khaataRecords[khaataRecords.length - 1].totalBaqaya}`, 14, finalY + 10);
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const fileName = `khaata_${account.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
        const pdfDataUri = doc.output('datauristring');
        const base64Data = pdfDataUri.split(',')[1];

        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
        });

        await Share.share({
          title: `Khaata Report: ${account.name}`,
          url: savedFile.uri,
        });
      } catch (e) {
        console.error('Error sharing PDF', e);
        alert(lang === 'ur' ? "فائل شیئر کرنے میں خرابی پیش آئی" : "Error sharing file");
      }
    } else {
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');
    }
  };

  const calculateAutoFields = (field: string, val: string) => {
    const updated = { ...entryFormData, [field]: val };
    
    const mix = Number(updated.mixWazan) || 0;
    const kaat = Number(updated.kaatInRati) || 0;
    const dia = Number(updated.pasaDia) || 0;
    
    let ip = Number(updated.itemPasa) || 0;
    if (field === 'mixWazan' || field === 'kaatInRati') {
      if (mix > 0) {
        ip = Number(((mix / 96) * (96 - kaat)).toFixed(3));
        updated.itemPasa = ip.toString();
      }
    }
    
    let previousBaqaya = 0;
    if (khaataRecords) {
      if (editEntryId) {
        const idx = khaataRecords.findIndex(r => r.id === editEntryId);
        if (idx > 0) {
          previousBaqaya = khaataRecords[idx - 1].totalBaqaya;
        }
      } else if (khaataRecords.length > 0) {
        previousBaqaya = khaataRecords[khaataRecords.length - 1].totalBaqaya;
      }
    }
    
    const baqaya = Number((previousBaqaya + ip - dia).toFixed(3));
    
    return { updated, baqaya };
  };

  // --- RENDER ACCOUNT LIST ---
  if (!selectedAccountId) {
    return (
      <div className="space-y-6">
        <ConfirmModal 
          isOpen={deleteAccountId !== null}
          onClose={() => setDeleteAccountId(null)}
          onConfirm={() => deleteAccountId !== null && confirmDeleteAccount(deleteAccountId)}
          title={lang === 'ur' ? 'کھاتہ ڈیلیٹ کریں؟' : 'Delete Account?'}
          message={lang === 'ur' ? 'کیا آپ واقعی اس کھاتہ اور اس کے تمام ریکارڈ کو حذف کرنا چاہتے ہیں؟' : 'Are you sure you want to delete this account and all its records?'}
          lang={lang}
        />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-sky-100">
          <h2 className="text-xl font-bold text-sky-900 urdu-text">{lang === 'ur' ? 'کاریگر کھاتہ' : 'Karigar Accounts'}</h2>
          <button 
            onClick={() => setIsAddingAccount(true)}
            className="w-full sm:w-auto bg-gold hover:bg-gold-dark text-black px-6 py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            <span className="urdu-text text-sm">{lang === 'ur' ? 'نیا کھاتہ' : 'New Account'}</span>
          </button>
        </div>

        {isAddingAccount && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-sky-100 mb-6">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="text-lg font-bold text-sky-900 urdu-text">{lang === 'ur' ? 'کھاتہ شامل کریں' : 'Add Account'}</h3>
              <button onClick={() => setIsAddingAccount(false)} className="text-zinc-400 hover:text-red-500">
                <X size={24} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-zinc-500 urdu-text">{lang === 'ur' ? 'نام' : 'Name'}:</label>
                <input 
                  type="text" 
                  value={accountFormData.name}
                  onChange={e => setAccountFormData({ ...accountFormData, name: e.target.value })}
                  className="w-full p-3 bg-white border border-sky-200 rounded-lg outline-none focus:border-gold text-black"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-500 urdu-text">{lang === 'ur' ? 'فون نمبر' : 'Phone'}:</label>
                <input 
                  type="text" 
                  value={accountFormData.phone}
                  onChange={e => setAccountFormData({ ...accountFormData, phone: e.target.value })}
                  className="w-full p-3 bg-white border border-sky-200 rounded-lg outline-none focus:border-gold text-black"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setIsAddingAccount(false)} className="px-6 py-2.5 text-zinc-500 hover:text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl font-bold transition-colors">
                {lang === 'ur' ? 'منسوخ' : 'Cancel'}
              </button>
              <button onClick={handleSaveAccount} className="px-8 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-sky-200 flex items-center gap-2">
                <Check size={20} />
                {lang === 'ur' ? 'محفوظ کریں' : 'Save'}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts?.map(acc => (
            <div 
              key={acc.id} 
              onClick={() => setSelectedAccountId(acc.id!)}
              className="bg-white p-5 rounded-2xl shadow-sm border border-sky-100 hover:border-gold hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-sky-900 urdu-text">{acc.name}</h3>
                  <p className="text-sm text-zinc-500 font-mono mt-1" dir="ltr">{acc.phone || '---'}</p>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteAccountId(acc.id!);
                  }} 
                  className="text-zinc-300 hover:text-red-500 p-1 rounded-lg"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="flex justify-end items-center text-sky-600 group-hover:text-gold transition-colors">
                <span className="text-sm urdu-text mr-2">{lang === 'ur' ? 'کھاتہ کھولیں' : 'Open Account'}</span>
                <ChevronRight size={18} />
              </div>
            </div>
          ))}
          {(!accounts || accounts.length === 0) && (
            <div className="col-span-full py-12 text-center text-zinc-400 urdu-text bg-white rounded-2xl border border-sky-100 border-dashed">
              {lang === 'ur' ? 'کوئی کھاتہ موجود نہیں' : 'No accounts found'}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- RENDER ENTRIES FOR SELECTED ACCOUNT ---
  return (
    <div className="space-y-6">
      <ConfirmModal 
        isOpen={deleteEntryId !== null}
        onClose={() => setDeleteEntryId(null)}
        onConfirm={() => deleteEntryId !== null && confirmDeleteEntry(deleteEntryId)}
        title={lang === 'ur' ? 'اندراج ڈیلیٹ کریں؟' : 'Delete Entry?'}
        message={lang === 'ur' ? 'کیا آپ واقعی اس اندراج کو حذف کرنا چاہتے ہیں؟' : 'Are you sure you want to delete this entry?'}
        lang={lang}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-sky-100">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSelectedAccountId(null)}
            className="p-2 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className={lang === 'ur' ? 'rotate-180' : ''} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-sky-900 urdu-text">
              {selectedAccount?.name}
            </h2>
            <p className="text-xs text-zinc-500 urdu-text">
              {lang === 'ur' ? 'کاریگر کھاتہ تفصیلات' : 'Karigar Account Details'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={handlePrintPDF}
            className="flex-1 sm:flex-none bg-sky-100 hover:bg-sky-200 text-sky-700 px-4 py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
            title={lang === 'ur' ? 'پرنٹ' : 'Print PDF'}
          >
            <FileText size={20} />
          </button>
          <button 
            onClick={handleWhatsAppShare}
            className="flex-1 sm:flex-none bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
            title={lang === 'ur' ? 'واٹس ایپ پر بھیجیں' : 'Share to WhatsApp'}
          >
            <Share2 size={20} />
          </button>
          <button 
            onClick={() => {
              setEntryFormData({
                date: new Date().toISOString().split('T')[0],
                itemDetail: '',
                pakaye: '',
                mixWazan: '',
                kaatInRati: '',
                itemPasa: '',
                pasaDia: '',
              });
              setIsAddingEntry(true);
              setEditEntryId(null);
            }}
            className="w-full sm:w-auto bg-gold hover:bg-gold-dark text-black px-6 py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            <span className="urdu-text text-sm">{lang === 'ur' ? 'نیا اندراج' : 'New Entry'}</span>
          </button>
        </div>
      </div>

      {isAddingEntry && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-sky-100 mb-6">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h3 className="text-lg font-bold text-sky-900 urdu-text">{editEntryId ? (lang === 'ur' ? 'ترمیم اندراج' : 'Edit Entry') : (lang === 'ur' ? 'نیا اندراج' : 'New Entry')}</h3>
            <button onClick={() => setIsAddingEntry(false)} className="text-zinc-400 hover:text-red-500">
              <X size={24} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 urdu-text">{lang === 'ur' ? 'تاریخ' : 'Date'}:</label>
              <input 
                type="date" 
                value={entryFormData.date}
                onChange={e => setEntryFormData({ ...entryFormData, date: e.target.value })}
                className="w-full p-3 bg-white border border-sky-200 rounded-lg outline-none focus:border-gold text-black"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-500 urdu-text">{lang === 'ur' ? 'آئٹم کی تفصیل' : 'Item Detail'}:</label>
              <MultiSelectInput 
                options={t.itemDetailsList}
                value={entryFormData.itemDetail}
                onChange={val => setEntryFormData({ ...entryFormData, itemDetail: val })}
                lang={lang}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-500 urdu-text">{lang === 'ur' ? 'پکاۓ' : 'Pakaye'}:</label>
              <input 
                type="number" 
                step="any"
                value={entryFormData.pakaye}
                onChange={e => setEntryFormData(calculateAutoFields('pakaye', e.target.value).updated)}
                className="w-full p-3 bg-white border border-sky-200 rounded-lg outline-none focus:border-gold text-black"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-500 urdu-text">{lang === 'ur' ? 'مکس وزن' : 'Mix Wazan'}:</label>
              <input 
                type="number" 
                step="any"
                value={entryFormData.mixWazan}
                onChange={e => setEntryFormData(calculateAutoFields('mixWazan', e.target.value).updated)}
                className="w-full p-3 bg-white border border-sky-200 rounded-lg outline-none focus:border-gold text-black"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-500 urdu-text">{lang === 'ur' ? 'کاٹ رتی میں' : 'Kaat in Rati'}:</label>
              <input 
                type="number" 
                step="any"
                value={entryFormData.kaatInRati}
                onChange={e => setEntryFormData(calculateAutoFields('kaatInRati', e.target.value).updated)}
                className="w-full p-3 bg-white border border-sky-200 rounded-lg outline-none focus:border-gold text-black"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-500 urdu-text">{lang === 'ur' ? 'آئٹم پاسہ' : 'Item Pasa'}:</label>
              <input 
                type="number" 
                step="any"
                value={entryFormData.itemPasa}
                onChange={e => setEntryFormData(calculateAutoFields('itemPasa', e.target.value).updated)}
                className="w-full p-3 bg-white border border-sky-200 rounded-lg outline-none focus:border-gold text-black"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-500 urdu-text">{lang === 'ur' ? 'پاسہ دیا' : 'Pasa Dia'}:</label>
              <input 
                type="number" 
                step="any"
                value={entryFormData.pasaDia}
                onChange={e => setEntryFormData(calculateAutoFields('pasaDia', e.target.value).updated)}
                className="w-full p-3 bg-white border border-sky-200 rounded-lg outline-none focus:border-gold text-black"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 urdu-text">{lang === 'ur' ? 'ٹوٹل بقایا' : 'Total Baqaya'}:</label>
              <input 
                type="number" 
                value={calculateAutoFields('mixWazan', entryFormData.mixWazan).baqaya}
                disabled
                className="w-full p-3 bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-600 font-extrabold cursor-not-allowed"
              />
            </div>

          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setIsAddingEntry(false)} className="px-6 py-2.5 text-zinc-500 hover:text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl font-bold transition-colors">
              {lang === 'ur' ? 'منسوخ' : 'Cancel'}
            </button>
            <button onClick={handleSaveEntry} className="px-8 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-sky-200 flex items-center gap-2">
              <Check size={20} />
              {lang === 'ur' ? 'محفوظ کریں' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-sky-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left rtl:text-right text-zinc-600">
            <thead className="text-xs text-sky-900 uppercase bg-sky-50 border-b border-sky-100">
              <tr>
                <th className="px-6 py-4 urdu-text">{lang === 'ur' ? 'تاریخ' : 'Date'}</th>
                <th className="px-6 py-4 urdu-text">{lang === 'ur' ? 'آئٹم کی تفصیل' : 'Item Detail'}</th>
                <th className="px-6 py-4 urdu-text">{lang === 'ur' ? 'پکاۓ' : 'Pakaye'}</th>
                <th className="px-6 py-4 urdu-text">{lang === 'ur' ? 'مکس وزن' : 'Mix Wazan'}</th>
                <th className="px-6 py-4 urdu-text">{lang === 'ur' ? 'کاٹ رتی میں' : 'Kaat in Rati'}</th>
                <th className="px-6 py-4 urdu-text">{lang === 'ur' ? 'آئٹم پاسہ' : 'Item Pasa'}</th>
                <th className="px-6 py-4 urdu-text">{lang === 'ur' ? 'پاسہ دیا' : 'Pasa Dia'}</th>
                <th className="px-6 py-4 urdu-text font-bold text-red-600">{lang === 'ur' ? 'ٹوٹل بقایا' : 'Total Baqaya'}</th>
                <th className="px-6 py-4 urdu-text text-center">{lang === 'ur' ? 'ایکشن' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {khaataRecords?.map((record) => (
                <tr key={record.id} className="border-b border-zinc-100 hover:bg-sky-50/50 transition-colors cursor-pointer" onClick={() => handleEditEntry(record)}>
                  <td className="px-6 py-4 whitespace-nowrap">{formatDate(record.date, lang === 'ur' ? 'ur-PK' : 'en-US')}</td>
                  <td className="px-6 py-4 font-medium text-zinc-900">{record.itemDetail}</td>
                  <td className="px-6 py-4">{record.pakaye}</td>
                  <td className="px-6 py-4">{record.mixWazan}</td>
                  <td className="px-6 py-4">{record.kaatInRati}</td>
                  <td className="px-6 py-4">{record.itemPasa}</td>
                  <td className="px-6 py-4">{record.pasaDia}</td>
                  <td className="px-6 py-4 font-bold text-red-600">{record.totalBaqaya}</td>
                  <td className="px-6 py-4 flex items-center justify-center gap-3" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleEditEntry(record)} className="text-zinc-400 hover:text-sky-500 transition-colors p-1.5 hover:bg-sky-50 rounded-lg">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => setDeleteEntryId(record.id!)} className="text-zinc-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-lg">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {(!khaataRecords || khaataRecords.length === 0) && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-zinc-400 urdu-text">
                    {lang === 'ur' ? 'کوئی ریکارڈ نہیں ملا' : 'No records found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

