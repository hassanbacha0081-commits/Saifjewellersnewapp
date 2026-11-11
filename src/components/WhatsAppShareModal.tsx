import React, { useState } from 'react';
import { X, MessageCircle, Download, Copy, Check, ExternalLink, Camera, Phone, User, FileText, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { shareImageViaWhatsApp, copyImageToClipboard, downloadImage } from '../lib/whatsappShare';
import { formatWhatsAppUrl } from '../lib/utils';
import { Language } from '../translations';

export interface WhatsAppShareData {
  img: string;
  phone: string;
  name?: string;
  caption?: string;
  title?: string;
}

interface WhatsAppShareModalProps {
  data: WhatsAppShareData | null;
  onClose: () => void;
  lang?: Language;
}

export default function WhatsAppShareModal({ data, onClose, lang = 'ur' }: WhatsAppShareModalProps) {
  if (!data) return null;

  const isUrdu = lang === 'ur';
  const [phoneNumber, setPhoneNumber] = useState(data.phone || '');
  const [captionText, setCaptionText] = useState(data.caption || '');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    setIsSending(true);
    setStatusMessage(null);
    try {
      const res = await shareImageViaWhatsApp({
        imageBase64: data.img,
        phone: phoneNumber,
        customerName: data.name,
        caption: captionText,
        fileName: `${data.title || 'jewellery'}_${data.name || 'image'}`
      });

      setStatusMessage({
        text: res.message,
        type: res.success ? 'success' : 'error'
      });
    } catch (e: any) {
      console.error('Share error:', e);
      setStatusMessage({
        text: isUrdu ? 'شیئرنگ میں خرابی پیش آگئی' : 'Failed to share image',
        type: 'error'
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = async () => {
    const success = await copyImageToClipboard(data.img);
    if (success) {
      setCopied(true);
      setStatusMessage({
        text: isUrdu ? 'تصویر کلپ بورڈ پر کاپی ہو گئی ہے!' : 'Image copied to clipboard!',
        type: 'success'
      });
      setTimeout(() => setCopied(false), 3000);
    } else {
      setStatusMessage({
        text: isUrdu ? 'کلپ بورڈ پر کاپی نہیں ہو سکی' : 'Could not copy to clipboard',
        type: 'error'
      });
    }
  };

  const handleDownload = () => {
    downloadImage(data.img, `${data.title || 'jewellery_image'}_${Date.now()}.jpg`);
    setStatusMessage({
      text: isUrdu ? 'تصویر ڈاؤنلوڈ کر لی گئی ہے' : 'Image downloaded',
      type: 'success'
    });
  };

  const handleSendTextOnly = () => {
    const url = formatWhatsAppUrl(phoneNumber, captionText);
    if (url) {
      window.open(url, '_blank');
      setStatusMessage({
        text: isUrdu ? 'واٹس ایپ چیٹ کھول دی گئی ہے' : 'WhatsApp opened',
        type: 'info'
      });
    } else {
      setStatusMessage({
        text: isUrdu ? 'فون نمبر درست نہیں ہے' : 'Invalid phone number',
        type: 'error'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] border border-sky-100"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 text-white flex justify-between items-center shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-inner">
              <MessageCircle size={22} />
            </div>
            <div>
              <h3 className="font-bold text-base urdu-text leading-tight">
                {isUrdu ? 'تصویر واٹس ایپ پر بھیجیں' : 'Send Picture via WhatsApp'}
              </h3>
              <p className="text-[11px] text-emerald-100 font-sans opacity-90">
                {data.title || (isUrdu ? 'محفوظ شدہ تصویر' : 'Saved Image')}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white"
            title={isUrdu ? 'بند کریں' : 'Close'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Status Message */}
          <AnimatePresence>
            {statusMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`p-3 rounded-xl text-xs font-bold border flex items-center gap-2 urdu-text ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : statusMessage.type === 'error'
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-sky-50 text-sky-800 border-sky-200'
                }`}
              >
                {statusMessage.type === 'success' ? <Check size={16} className="text-emerald-600 flex-shrink-0" /> : <Sparkles size={16} className="text-sky-600 flex-shrink-0" />}
                <span className="flex-1 leading-relaxed">{statusMessage.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Image Thumbnail Preview & Details */}
          <div className="flex gap-3 items-center p-3 bg-zinc-50 rounded-xl border border-zinc-200">
            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 border-white shadow-sm bg-zinc-100">
              <img 
                src={data.img} 
                alt="Selected" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="flex-1 min-w-0">
              {data.name && (
                <div className="flex items-center gap-1.5 text-zinc-800 font-bold text-sm urdu-text">
                  <User size={14} className="text-gold-dark" />
                  <span className="truncate">{data.name}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-zinc-600 text-xs font-mono mt-0.5">
                <Phone size={13} className="text-green-600" />
                <span dir="ltr">{phoneNumber || (isUrdu ? 'فون نمبر نہیں ہے' : 'No Phone')}</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 urdu-text">
                {isUrdu ? 'سیف جیولرز کی محفوظ شدہ تصویر' : 'Saved image from Saif Jewellers'}
              </p>
            </div>
          </div>

          {/* Phone Number Input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-600 urdu-text flex items-center justify-between">
              <span>{isUrdu ? 'واٹس ایپ نمبر:' : 'WhatsApp Phone Number:'}</span>
              <span className="text-[10px] text-zinc-400 font-normal font-sans">0300... / 923...</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="03001234567"
                dir="ltr"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-sky-200 rounded-xl outline-none focus:border-green-600 text-sm font-mono text-zinc-800 shadow-xs"
              />
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            </div>
          </div>

          {/* Caption Message Textarea */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-600 urdu-text flex items-center justify-between">
              <span>{isUrdu ? 'پیغام / تفصیل (Caption):' : 'Message Caption:'}</span>
              <FileText size={13} className="text-zinc-400" />
            </label>
            <textarea
              value={captionText}
              onChange={(e) => setCaptionText(e.target.value)}
              rows={3}
              className="w-full p-2.5 bg-white border border-sky-200 rounded-xl outline-none focus:border-green-600 text-xs text-zinc-800 urdu-text resize-none leading-relaxed shadow-xs"
              placeholder={isUrdu ? 'واٹس ایپ پر بھیجنے کے لیے تفصیل...' : 'Message to send along with picture...'}
            />
          </div>

          {/* User Instructions / Desktop Tip */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-[11px] text-emerald-900 urdu-text leading-relaxed">
            <span className="font-bold">💡 {isUrdu ? 'رہنمائی:' : 'Tip:'} </span>
            {isUrdu 
              ? 'موبائل پر بٹن دبانے سے تصویر براہ راست واٹس ایپ میں شیئر ہوگی۔ کمپیوٹر پر تصویر خودکار کاپی اور ڈاؤنلوڈ ہو جائے گی اور واٹس ایپ میں آپ صرف Ctrl+V (Paste) دبائیں۔'
              : 'On mobile, this shares the image directly to WhatsApp. On desktop, the image is copied & downloaded and WhatsApp opens, ready to Paste (Ctrl+V).'}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-200 space-y-2">
          {/* Main Action: Send to WhatsApp */}
          <button
            type="button"
            disabled={isSending}
            onClick={handleShare}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-600/20 transition-all flex items-center justify-center gap-2 urdu-text text-sm disabled:opacity-50"
          >
            <MessageCircle size={18} />
            <Camera size={14} className="-ml-1" />
            <span>{isUrdu ? 'واٹس ایپ پر تصویر بھیجیں' : 'Send Picture via WhatsApp'}</span>
            <ExternalLink size={14} className="opacity-70" />
          </button>

          {/* Secondary Actions Row */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopy}
              className="py-2 px-2 bg-white border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 urdu-text transition-colors"
              title={isUrdu ? 'تصویر کلپ بورڈ پر کاپی کریں' : 'Copy Image to Clipboard'}
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-zinc-500" />}
              <span>{isUrdu ? 'کاپی تصویر' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="py-2 px-2 bg-white border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 urdu-text transition-colors"
              title={isUrdu ? 'تصویر ڈاؤنلوڈ کریں' : 'Download Image'}
            >
              <Download size={14} className="text-zinc-500" />
              <span>{isUrdu ? 'ڈاؤنلوڈ' : 'Download'}</span>
            </button>

            <button
              type="button"
              onClick={handleSendTextOnly}
              className="py-2 px-2 bg-white border border-green-200 hover:bg-green-50 text-green-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 urdu-text transition-colors"
              title={isUrdu ? 'صرف ٹیکسٹ پیغام بھیجیں' : 'Send Text Only'}
            >
              <MessageCircle size={14} className="text-green-600" />
              <span>{isUrdu ? 'صرف ٹیکسٹ' : 'Text Only'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
