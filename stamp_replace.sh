sed -i 's/<div className="footer-brand-box" dir="ltr">/<div className="flex items-center justify-start opacity-50 pt-4" dir="ltr">\n            <div className="w-20 h-20 border-4 border-red-800 rounded-full flex flex-col items-center justify-center text-red-800 p-1" style={{ transform: '\''rotate(-15deg)'\'' }}>\n              <img src={APP_CONFIG.appIcon} alt="Stamp" className="w-8 h-8 object-cover opacity-80" referrerPolicy="no-referrer" \/>\n              <span className="font-sans text-[7px] font-black tracking-wider mt-1 text-center uppercase leading-tight">{APP_CONFIG.shopNameEnglish}<\/span>\n            <\/div>/g' src/components/PrintReceipt.tsx

sed -i 's/<img src={WHATSAPP_ICON}.*//g' src/components/PrintReceipt.tsx
sed -i 's/<span className="font-mono text-xs text-zinc-600 font-bold">{shopSettings.phone}<\/span>//g' src/components/PrintReceipt.tsx
sed -i 's/<\/div>\n *<div className="mt-4 flex items-center justify-end gap-2 text-zinc-500 opacity-60 w-full" dir="ltr">/<div className="hidden">/g' src/components/PrintReceipt.tsx
sed -i 's/<\/div>\n *<div className="mt-2 flex items-center justify-end gap-2 text-zinc-500 opacity-60 w-full" dir="ltr">/<div className="hidden">/g' src/components/PrintReceipt.tsx
sed -i 's/<span className="font-sans text-xs italic font-medium">{APP_CONFIG.shopNameEnglish}<\/span>//g' src/components/PrintReceipt.tsx
sed -i 's/<img src={APP_CONFIG.appIcon} alt="Logo" className="w-8 h-8 rounded border border-zinc-300 object-cover grayscale" referrerPolicy="no-referrer" \/>//g' src/components/PrintReceipt.tsx
