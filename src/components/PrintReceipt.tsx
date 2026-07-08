import React, { forwardRef, useState, useEffect } from 'react';
import { Sale, Order, Repair, KarigarRecord, StockItem, GoldPurchase, db } from '../db';
import { formatDate } from '../lib/utils';
import { translations } from '../translations';
import { APP_CONFIG } from '../config';


interface PrintReceiptProps {
  type: 'sale' | 'order' | 'repair' | 'karigar' | 'stock' | 'purchase';
  data: Sale | Order | Repair | KarigarRecord | StockItem | GoldPurchase;
  id?: number;
}

export const PrintReceipt = forwardRef<HTMLDivElement, PrintReceiptProps>(({ type, data, id }, ref) => {
  const [shopSettings, setShopSettings] = useState({
    name: translations.ur.shopName,
    address: translations.ur.shopAddress,
    phone: translations.ur.shopPhone,
    phone2: translations.ur.shopPhone2
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const name = await db.settings.get('shopName');
      const address = await db.settings.get('shopAddress');
      const phone = await db.settings.get('shopPhone');
      const phone2 = await db.settings.get('shopPhone2');
      
      setShopSettings({
        name: name?.value || translations.ur.shopName,
        address: address?.value || translations.ur.shopAddress,
        phone: phone?.value || translations.ur.shopPhone,
        phone2: phone2?.value || translations.ur.shopPhone2
      });
    };
    fetchSettings();
  }, []);

  const isPurchase = type === 'purchase';
  const widthStr = isPurchase ? '21cm' : '14.8cm';
  const heightStr = isPurchase ? '29.7cm' : '21cm';

  const printStyles = (
    <style>
      {`
        @import url('https://fonts.cdnfonts.com/css/jameel-noori-nastaleeq');
        @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&family=Inter:wght@400;700&display=swap');
        
        @media print {
          @page {
            size: ${widthStr} ${heightStr};
            margin: 0;
          }
          body {
            margin: 0;
            -webkit-print-color-adjust: exact;
            background: white !important;
          }
          .print-receipt-container {
            width: ${widthStr} !important;
            min-height: ${heightStr} !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 auto !important;
            padding: ${isPurchase ? '0.5cm 0.8cm 0.8cm 0.8cm' : '0.4cm 0.6cm 0.6cm 0.6cm'} !important;
            box-sizing: border-box !important;
            background: white !important;
            position: relative !important;
          }
        }
        .print-receipt-container {
          box-sizing: border-box !important;
          position: relative !important;
        }
        .receipt-border-decor {
          position: absolute !important;
          top: 12px !important;
          bottom: 12px !important;
          left: 12px !important;
          right: 12px !important;
          border: 4px double #800000 !important;
          outline: 1px solid #800000 !important;
          outline-offset: -6px !important;
          border-radius: 6px !important;
          pointer-events: none !important;
          z-index: 99 !important;
        }
        .urdu-text {
          font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif !important;
          line-height: 1.6;
        }
        .header-section {
          text-align: center;
          border-bottom: 3px double #800000;
          padding-bottom: ${isPurchase ? '10px' : '6px'};
          margin-bottom: ${isPurchase ? '20px' : '10px'};
          padding-top: 50px;
          
        }
        .shop-name {
          font-size: ${isPurchase ? '91px' : '74px'};
          font-weight: 900;
          color: #800000;
          margin: 0;
          margin-bottom: ${isPurchase ? '12px' : '6px'};
          font-family: 'Jameel Noori Nastaleeq', serif !important;
          line-height: 1.2;
        }
        .header-phone {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          margin-top: ${isPurchase ? '10px' : '6px'};
          width: 100%;
          flex-wrap: wrap;
        }
        .phone-brand-box, .phone-brand-box-secondary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: #f0fdf4;
          padding: ${isPurchase ? '6px 12px' : '4px 8px'};
          border-radius: 4px;
          border: 1.2px solid #22c55e;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          line-height: normal;
        }
        .phone-brand-box-secondary {
          background: #fffafa;
          border-color: #800000;
        }
        .brand-icon {
          width: ${isPurchase ? '26px' : '20px'};
          height: ${isPurchase ? '26px' : '20px'};
          object-fit: contain;
          display: block;
        }
        .phone-number {
          color: #166534;
          font-weight: 900;
          font-size: ${isPurchase ? '20px' : '15px'};
          letter-spacing: 0.5px;
          font-family: 'Inter', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .phone2-container {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: ${isPurchase ? '24px' : '18px'};
          font-weight: 900;
          color: #800000;
        }
        .receipt-footer {
          margin-top: ${isPurchase ? '50px' : '20px'};
          
          border-top: 1px solid #eee;
          text-align: center;
        }
        .footer-brand-box {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 15px;
          margin-top: 10px;
          opacity: 0.8;
        }
        .footer-icon {
          width: 24px;
          height: 24px;
          object-fit: contain;
        }
        .info-bar {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          background: #f8fafc;
          padding: 18px;
          border: 1.5px solid #e2e8f0;
          font-size: 16px;
          border-radius: 8px;
        }
        .receipt-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin-bottom: ${isPurchase ? '25px' : '12px'};
          border-top: 1.5px solid #ddd;
          border-right: 1.5px solid #ddd;
          background: white;
        }
        .receipt-table tr:nth-child(even) {
          background-color: #fcfcfc;
        }
        .receipt-table th {
          background: #800000 !important;
          background-color: #800000 !important;
          color: white !important;
          padding: ${isPurchase ? '16px 12px' : '14px 10px'};
          text-align: center;
          vertical-align: middle;
          border-bottom: 1.5px solid #ddd;
          border-left: 1.5px solid #ddd;
          font-size: ${isPurchase ? '18px' : '16px'};
          font-weight: bold;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          line-height: 1.8 !important;
        }
        .receipt-table td {
          padding: ${isPurchase ? '12px 12px' : '10px 10px'};
          text-align: right;
          vertical-align: middle;
          border-bottom: 1.5px solid #ddd;
          border-left: 1.5px solid #ddd;
          font-size: ${isPurchase ? '16px' : '14px'};
          color: #333;
          line-height: 1.8 !important;
        }
        .summary-table {
          width: ${isPurchase ? '320px' : '260px'};
          border: 2.5px solid #800000;
          border-radius: 12px;
          background: #fffcf5;
          margin-bottom: ${isPurchase ? '20px' : '10px'};
          padding-top: 50px;
          border-collapse: separate;
          border-spacing: 0;
          overflow: hidden;
        }
        .summary-table th, .summary-table td {
          border: none;
          padding: ${isPurchase ? '10px 15px' : '6px 10px'};
        }
        .summary-table th {
          background: transparent !important;
          color: #333 !important;
          text-align: right;
          font-weight: normal;
          width: 50%;
        }
        .summary-table td {
          text-align: right;
          font-weight: bold;
          width: 50%;
        }
        .final-total-row {
          border-top: 2px solid #800000 !important;
          font-size: ${isPurchase ? '22px' : '18px'} !important;
          color: #c62828 !important;
        }

        .terms {
          clear: both;
          margin-top: ${isPurchase ? '40px' : '15px'};
          font-size: ${isPurchase ? '12.5px' : '10.5px'};
          border-top: 1px solid #ccc;
          padding-top: ${isPurchase ? '15px' : '8px'};
          line-height: ${isPurchase ? '1.8' : '1.5'};
        }

        .font-nastaliq {
          font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif !important;
          line-height: 1.8 !important;
        }
        .info-grid {
          display: grid;
          grid-template-cols: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
          padding: 15px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-size: 12px;
        }
      `}
    </style>
  );

  if (type === 'sale') {
    const sale = data as Sale;
    const oldGoldDeduction = Math.round(sale.items.reduce((a, b) => a + (b.t < 0 ? Math.abs(b.t) : 0), 0));
    const totalBill = sale.total + oldGoldDeduction;

    return (
      <div ref={ref} className="print-receipt-container bg-white text-zinc-900" dir="rtl" style={{ 
        fontFamily: "'Inter', sans-serif", 
        width: '14.8cm', 
        minHeight: '21cm', 
        height: 'auto', 
        boxSizing: 'border-box', 
        position: 'relative', 
        padding: '0.5cm 1cm 1cm 1cm',
        paddingBottom: '2cm',
        backgroundColor: 'white'
      }}>
        {printStyles}
        <div className="receipt-border-decor" />
        <div className="header-section">
          <h1 className="shop-name text-center" style={{ width: '100%', display: 'block' }}>{shopSettings.name}</h1>
          <div style={{ height: '15px' }}></div>
          <p className="text-2xl font-bold m-1 font-nastaliq">ہمارے ہاں سنگاپور اور دبئی ورائٹی دستیاب ہے۔</p>
          <p className="text-lg m-1 font-nastaliq text-zinc-600">{shopSettings.address}</p>
          <div className="header-phone" dir="ltr">
            <div className="phone-brand-box">
              
              <span className="phone-number">{shopSettings.phone}</span>
            </div>
            {shopSettings.phone2 && (
              <div className="phone-brand-box-secondary">
                
                <span className="phone-number" style={{ color: '#800000' }}>{shopSettings.phone2}</span>
              </div>
            )}
          </div>
        </div>

          <table className="receipt-table" style={{ marginBottom: '20px' }}>
            <tbody>
              <tr>
                <th className="font-nastaliq" style={{ width: '15%', background: '#800000', color: 'white' }}>کسٹمر</th>
                <td className="font-nastaliq" style={{ width: '35%', paddingRight: '15px' }}>{sale.name}</td>
                <th className="font-nastaliq" style={{ width: '15%', background: '#800000', color: 'white' }}>موبائل</th>
                <td className="font-mono" style={{ width: '35%' }} dir="ltr">{sale.phone}</td>
              </tr>
              <tr>
                <th className="font-nastaliq" style={{ background: '#800000', color: 'white' }}>تاریخ</th>
                <td>{sale.date}</td>
                <th className="font-nastaliq" style={{ background: '#800000', color: 'white' }}>بل نمبر</th>
                <td className="font-bold text-gold">#{1000 + (id || 0)}</td>
              </tr>
              <tr>
                <th className="font-nastaliq" style={{ background: '#800000', color: 'white' }}>ریٹ فی تولہ</th>
                <td className="font-mono font-bold text-red-700">{(sale.items[0]?.r ? (sale.items[0]?.r * 12).toLocaleString() : '0')}</td>
                <th className="font-nastaliq" style={{ background: '#800000', color: 'white' }}>ریٹ فی گرام</th>
                <td className="font-mono font-bold text-red-700">{(sale.items[0]?.r || 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <table className="receipt-table" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr style={{ background: '#800000' }}>
                <th className="font-nastaliq" style={{ width: '20%', background: '#800000', color: 'white' }}>تفصیل</th>
                <th className="font-nastaliq" style={{ width: '8%', background: '#800000', color: 'white' }}>تعداد</th>
                <th className="font-nastaliq" style={{ width: '12%', background: '#800000', color: 'white' }}>وزن</th>
                <th className="font-nastaliq" style={{ width: '10%', background: '#800000', color: 'white' }}>پالش</th>
                <th className="font-nastaliq" style={{ width: '14%', background: '#800000', color: 'white' }}>کل وزن</th>
                <th className="font-nastaliq" style={{ width: '18%', background: '#800000', color: 'white' }}>کل قیمت</th>
                <th className="font-nastaliq" style={{ width: '18%', background: '#800000', color: 'white' }}>تصویر</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, i) => (
                <tr key={i}>
                  <td className="text-right font-bold font-nastaliq" style={{ paddingRight: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.n}</td>
                  <td className="font-mono">{item.t < 0 ? '-' : (item.p || 1)}</td>
                  <td className="font-mono font-bold">{parseFloat(Number(item.w).toFixed(2))}g</td>
                  <td className="font-mono">{parseFloat(Number(item.mk).toFixed(2))}g</td>
                  <td className="font-mono font-bold">{parseFloat(Number(item.w + item.mk).toFixed(2))}g</td>
                  <td className="font-bold font-mono">{Math.round(item.t).toLocaleString()}</td>
                  <td style={{ padding: '4px', verticalAlign: 'middle' }}>
                    {item.img ? (
                      <img 
                        src={item.img} 
                        alt="" 
                        style={{ height: '102px', maxHeight: '102px', width: 'auto', maxWidth: '100%', objectFit: 'contain', margin: '0 auto' }} 
                        className="rounded border border-zinc-200 shadow-sm"
                      />
                    ) : (
                      <span className="text-zinc-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-start mt-4">
            <table className="summary-table" style={{ marginLeft: 'auto' }}>
              <tbody>
                <tr>
                  <th className="font-nastaliq">کل بل رقم</th>
                  <td className="font-mono">{totalBill.toLocaleString()}</td>
                </tr>
                <tr className="text-red-700">
                  <th className="font-nastaliq">پرانا سونا منہا (-)</th>
                  <td className="font-mono">{oldGoldDeduction.toLocaleString()}</td>
                </tr>
                <tr className="text-green-700">
                  <th className="font-nastaliq">وصول شدہ رقم</th>
                  <td className="font-mono">{sale.rec.toLocaleString()}</td>
                </tr>
                <tr className="final-total-row">
                  <th className="font-nastaliq font-black">صاف بقایا</th>
                  <td className="font-black font-mono">{sale.rem.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-start terms-container border-t border-zinc-300 pt-4 mt-6">
            <div className="terms font-nastaliq" style={{ border: 'none', marginTop: 0, paddingTop: 0, width: '70%' }}>
            <b>شرائط و ضوابط:</b><br />
            1۔ زیورات کی واپسی پر 25% کاٹ لیا جائے گا۔<br />
            2۔ کسٹمر اپنا تیار سامان 1 ہفتہ کے اندر وصول کرنے کا پابند ہوگا۔<br />
            3۔ تیار شدہ سامان چھوڑنے پر 20% کاٹ لیا جائے گا۔<br />
            4۔ فی تولہ 1 ماشہ پالش کاٹ ہوگا۔<br />
            5۔ آرڈر دیتے وقت 75-80% رقم لازمی دینا ہوگی۔<br />
            6۔ پرانے زیورات توڑ کر نئے زیورات تیار کرنے پر پانسہ 2 ماشہ اور پونڈ پانسہ 3 ماشہ فی تولہ کاٹ لیا جائے گا۔<br />
            7۔ استعمال سے پہلے بینگلز کے وزن کی تسلی کریں، گھس جانے کی وجہ سے بعد میں دکاندار ذمہ دار نہیں ہوگا۔
          </div>
            <div className="w-[30%] flex justify-start opacity-50" dir="ltr">
              <div className="w-20 h-20 border-4 border-red-800 rounded-full flex flex-col items-center justify-center text-red-800 p-1" style={{ transform: 'rotate(-15deg)' }}>
                <span className="font-sans text-[10px] font-black tracking-wider text-center uppercase leading-tight">{APP_CONFIG.shopNameEnglish}</span>
              </div>
            </div>
          </div>
        </div>
    );
  }

    if (type === 'order') {
      const order = data as Order;
      return (
        <div ref={ref} className="print-receipt-container bg-white text-zinc-900" dir="rtl" style={{ 
          fontFamily: "'Inter', sans-serif", 
          width: '14.8cm', 
          minHeight: '21cm', 
          height: 'auto', 
          boxSizing: 'border-box', 
          position: 'relative', 
          padding: '0.4cm 0.6cm 0.6cm 0.6cm',
          paddingBottom: '1.5cm',
          backgroundColor: 'white'
        }}>
          {printStyles}
          <div className="receipt-border-decor" />
          <div className="header-section">
            <h1 className="shop-name text-center" style={{ width: '100%', display: 'block' }}>{shopSettings.name}</h1>
            <div style={{ height: '6px' }}></div>
            <p className="text-xl font-bold m-1 font-nastaliq" style={{ fontSize: '18px' }}>ہمارے ہاں سنگاپور اور دبئی ورائٹی دستیاب ہے۔</p>
            <p className="text-md m-1 font-nastaliq text-zinc-600" style={{ fontSize: '13px' }}>{shopSettings.address}</p>
            <div className="header-phone" dir="ltr">
              <div className="phone-brand-box">
                
                <span className="phone-number">{shopSettings.phone}</span>
              </div>
              {shopSettings.phone2 && (
                <div className="phone-brand-box-secondary">
                  
                  <span className="phone-number" style={{ color: '#800000' }}>{shopSettings.phone2}</span>
                </div>
              )}
            </div>
            <div className="bg-zinc-100 px-3 py-1 mt-2 font-bold rounded-lg text-gold text-base font-nastaliq border border-gold-20 inline-block">آرڈر بکنگ رسید</div>
          </div>

          <table className="receipt-table" style={{ marginBottom: '10px' }}>
            <tbody>
              <tr>
                <th className="font-nastaliq" style={{ width: '18%', background: '#800000', color: 'white', padding: '5px' }}>نام کسٹمر</th>
                <td className="font-nastaliq font-bold" style={{ width: '32%', paddingRight: '10px' }}>{order.name}</td>
                <th className="font-nastaliq" style={{ width: '18%', background: '#800000', color: 'white', padding: '5px' }}>فون نمبر</th>
                <td className="font-mono" style={{ width: '32%' }} dir="ltr">{order.phone}</td>
              </tr>
              <tr>
                <th className="font-nastaliq" style={{ background: '#800000', color: 'white', padding: '5px' }}>تاریخ بکنگ</th>
                <td className="font-mono">{order.date}</td>
                <th className="font-nastaliq" style={{ background: '#800000', color: 'white', padding: '5px' }}>تاریخ واپسی</th>
                <td className="font-mono font-bold text-red-600">{order.due}</td>
              </tr>
              <tr>
                <th className="font-nastaliq" style={{ background: '#800000', color: 'white', padding: '5px' }}>نام آئٹم</th>
                <td className="font-nastaliq font-bold" style={{ paddingRight: '10px' }}>{order.item}</td>
                <th className="font-nastaliq" style={{ background: '#800000', color: 'white', padding: '5px' }}>نام کاریگر</th>
                <td className="font-nastaliq" style={{ paddingRight: '10px' }}>{order.karigar}</td>
              </tr>
              <tr>
                <th className="font-nastaliq" style={{ background: '#800000', color: 'white', padding: '5px' }}>پیمائش</th>
                <td className="font-mono font-bold">{order.measurements || '-'}</td>
                <th className="font-nastaliq" style={{ background: '#800000', color: 'white', padding: '5px' }}>فی تولہ ریٹ</th>
                <td className="font-mono font-bold text-gold">{order.pricePerTola || '-'}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-2">
            <h4 className="font-bold mb-1 text-xs font-nastaliq text-right text-gold">وزن کی تفصیل:</h4>
            <table className="receipt-table" style={{ tableLayout: 'fixed', width: '100%', marginBottom: '10px' }}>
              <thead>
                <tr style={{ background: '#800000' }}>
                  <th className="font-nastaliq" style={{ width: '25%', background: '#800000', color: 'white', padding: '5px' }}>پرانا وزن</th>
                  <th className="font-nastaliq" style={{ width: '25%', background: '#800000', color: 'white', padding: '5px' }}>وزن / تیار وزن</th>
                  <th className="font-nastaliq" style={{ width: '25%', background: '#800000', color: 'white', padding: '5px' }}>پالش</th>
                  <th className="font-nastaliq" style={{ width: '25%', background: '#800000', color: 'white', padding: '5px' }}>ٹوٹل وزن</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-mono font-bold" style={{ padding: '4px' }}>{order.oldWt ? `${parseFloat(Number(order.oldWt).toFixed(2))}g` : '-'}</td>
                  <td className="font-mono font-bold" style={{ padding: '4px' }}>{order.readyWt ? `${parseFloat(Number(order.readyWt).toFixed(2))}g` : '-'}</td>
                  <td className="font-bold font-nastaliq" style={{ padding: '4px' }}>{order.makingCharges || '-'}</td>
                  <td className="font-mono font-bold" style={{ padding: '4px' }}>{order.totalWt ? `${parseFloat(Number(order.totalWt).toFixed(2))}g` : '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {order.img && (
            <div className="mt-2 text-center">
              <p className="font-bold text-xs font-nastaliq mb-1 text-right">تصویر:</p>
              <img src={order.img} alt="" className="max-h-36 mx-auto border border-zinc-200 rounded-lg shadow-sm" style={{ objectFit: 'contain' }} />
            </div>
          )}

          <h4 className="font-bold mt-2 mb-1 text-xs font-nastaliq text-right">ادائیگیوں کی تفصیل:</h4>
          <table className="receipt-table" style={{ tableLayout: 'fixed', width: '100%', marginBottom: '10px' }}>
            <thead>
              <tr style={{ background: '#800000' }}>
                <th className="font-nastaliq" style={{ width: '33%', background: '#800000', color: 'white', padding: '5px' }}>معطلی نمبر</th>
                <th className="font-nastaliq" style={{ width: '33%', background: '#800000', color: 'white', padding: '5px' }}>رقم</th>
                <th className="font-nastaliq" style={{ width: '34%', background: '#800000', color: 'white', padding: '5px' }}>تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {order.payments.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-zinc-400 font-nastaliq py-1 text-center text-xs">کوئی ادائیگی نہیں ہوئی</td>
                </tr>
              ) : (
                order.payments.slice(0, 8).map((p, i) => (
                  <tr key={i}>
                    <td className="font-nastaliq" style={{ padding: '3px' }}>قسط {i + 1}</td>
                    <td className="font-mono font-bold" style={{ padding: '3px' }}>{p.amt.toLocaleString()}</td>
                    <td className="font-mono" style={{ padding: '3px' }}>{p.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex justify-start mt-2">
            <table className="summary-table" style={{ marginLeft: 'auto', marginBottom: '8px' }}>
              <tbody>
                <tr>
                  <th className="font-nastaliq" style={{ padding: '5px 10px' }}>کل رقم</th>
                  <td className="font-mono font-bold text-right" style={{ padding: '5px 10px' }}>{order.total.toLocaleString()}</td>
                </tr>
                <tr className="final-total-row">
                  <th className="font-nastaliq font-black text-right font-bold text-gold-dark" style={{ padding: '5px 10px' }}>صاف بقایا</th>
                  <td className="font-black font-mono text-gold-dark text-right" style={{ padding: '5px 10px' }}>{order.rem.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-start terms-container border-t border-zinc-300 pt-4 mt-4">
            <div className="terms font-nastaliq" style={{ border: 'none', marginTop: 0, paddingTop: 0, width: '70%', fontSize: '10px' }}>
            <b>شرائط و ضوابط:</b><br />
            1۔ زیورات کی واپسی پر 25% کاٹ لیا جائے گا۔<br />
            2۔ کسٹمر اپنا تیار سامان 1 ہفتہ کے اندر وصول کرنے کا پابند ہوگا۔<br />
            3۔ تیار شدہ سامان چھوڑنے پر 20% کاٹ لیا جائے گا۔<br />
            4۔ فی تولہ 1 ماشہ پالش کاٹ ہوگا۔<br />
            5۔ آرڈر دیتے وقت 75-80% رقم لازمی دینا ہوگی۔<br />
            6۔ پرانے زیورات توڑ کر نئے زیورات تیار کرنے پر پانسہ 2 ماشہ اور پونڈ پانسہ 3 ماشہ فی تولہ کاٹ لیا جائے گا۔<br />
            7۔ استعمال سے پہلے بینگلز کے وزن کی تسلی کریں، گھس جانے کی وجہ سے بعد میں دکاندار ذمہ دار نہیں ہوگا۔
          </div>
            <div className="w-[30%] flex justify-start opacity-50" dir="ltr">
              <div className="w-20 h-20 border-4 border-red-800 rounded-full flex flex-col items-center justify-center text-red-800 p-1" style={{ transform: 'rotate(-15deg)' }}>
                <span className="font-sans text-[10px] font-black tracking-wider text-center uppercase leading-tight">{APP_CONFIG.shopNameEnglish}</span>
              </div>
            </div>
          </div>
        </div>
    );
  }

    if (type === 'repair') {
      const repair = data as Repair;
      return (
        <div ref={ref} className="print-receipt-container bg-white text-zinc-900" dir="rtl" style={{ 
          fontFamily: "'Inter', sans-serif", 
          width: '14.8cm', 
          minHeight: '21cm', 
          height: 'auto', 
          boxSizing: 'border-box', 
          position: 'relative', 
          padding: '0.5cm 1cm 1cm 1cm',
          paddingBottom: '2.5cm',
          backgroundColor: 'white'
        }}>
          {printStyles}
          <div className="receipt-border-decor" />
          <div className="header-section">
            <h1 className="shop-name text-center" style={{ width: '100%', display: 'block' }}>{shopSettings.name}</h1>
            <div style={{ height: '15px' }}></div>
            <p className="text-2xl font-bold m-1 font-nastaliq">ہمارے ہاں سنگاپور اور دبئی ورائٹی دستیاب ہے۔</p>
            <p className="text-lg m-1 font-nastaliq text-zinc-600">{shopSettings.address}</p>
            <div className="header-phone" dir="ltr">
              <div className="phone-brand-box">
                
                <span className="phone-number">{shopSettings.phone}</span>
              </div>
              {shopSettings.phone2 && (
                <div className="phone-brand-box-secondary">
                  
                  <span className="phone-number" style={{ color: '#800000' }}>{shopSettings.phone2}</span>
                </div>
              )}
            </div>
            <div className="bg-zinc-100 px-3 py-1 mt-4 font-bold rounded-lg text-gold text-lg font-nastaliq border border-gold-20 inline-block">ریپیئرنگ رسید</div>
          </div>

          <table className="receipt-table">
            <tbody>
              <tr>
                <th className="font-nastaliq" style={{ width: '20%' }}>کسٹمر</th>
                <td className="font-bold" style={{ width: '30%' }}>{repair.customerName}</td>
                <th className="font-nastaliq" style={{ width: '20%' }}>تاریخ</th>
                <td className="font-bold" style={{ width: '30%' }} dir="ltr">{formatDate(repair.date, 'ur-PK')}</td>
              </tr>
              <tr>
                <th className="font-nastaliq">فون</th>
                <td className="font-bold" dir="ltr">{repair.customerPhone}</td>
                <th className="font-nastaliq">حالت</th>
                <td className="font-bold">{repair.status === 'Done' ? 'تیار ہے' : 'انتظار'}</td>
              </tr>
            </tbody>
          </table>

          <table className="receipt-table" style={{ marginTop: '20px' }}>
            <tbody>
              <tr>
                <th className="font-nastaliq" style={{ width: '25%', background: '#f9f9f9' }}>آئٹم</th>
                <td className="font-nastaliq" style={{ width: '75%', textAlign: 'right', paddingRight: '15px' }}>{repair.item}</td>
              </tr>
              <tr>
                <th className="font-nastaliq" style={{ background: '#f9f9f9' }}>مسئلہ</th>
                <td className="font-nastaliq" style={{ textAlign: 'right', paddingRight: '15px' }}>{repair.issue}</td>
              </tr>
              <tr className="final-total-row">
                <th className="font-nastaliq font-black">رقم</th>
                <td className="font-bold text-red-700 font-mono" style={{ textAlign: 'right', paddingRight: '15px', fontSize: '20px' }}>{repair.charges.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          {repair.img && (
            <div className="mt-4 text-center">
              <img src={repair.img} alt="" className="max-h-48 mx-auto border border-zinc-200 rounded" />
            </div>
          )}

          <div className="flex justify-between items-start terms-container border-t border-zinc-300 pt-4 mt-6">
            <p className="text-[14px] font-nastaliq text-zinc-600" style={{ width: '70%' }}>* ریپیئرنگ کے دوران کسی بھی قسم کے نقصان کی صورت میں دکان ذمہ دار نہیں ہوگی۔</p>
            <div className="w-[30%] flex justify-start opacity-50" dir="ltr">
              <div className="w-20 h-20 border-4 border-red-800 rounded-full flex flex-col items-center justify-center text-red-800 p-1" style={{ transform: 'rotate(-15deg)' }}>
                <span className="font-sans text-[10px] font-black tracking-wider text-center uppercase leading-tight">{APP_CONFIG.shopNameEnglish}</span>
              </div>
            </div>
          </div>
        </div>
    );
  }

    if (type === 'karigar') {
      const karigar = data as KarigarRecord;
      return (
        <div ref={ref} className="print-receipt-container bg-white text-zinc-900" dir="rtl" style={{ 
          fontFamily: "'Inter', sans-serif", 
          width: '14.8cm', 
          minHeight: '21cm', 
          height: 'auto', 
          boxSizing: 'border-box', 
          position: 'relative', 
          padding: '0.5cm 1cm 1cm 1cm',
          paddingBottom: '2.5cm',
          backgroundColor: 'white'
        }}>
          {printStyles}
          <div className="receipt-border-decor" />
          <div className="header-section">
            <h1 className="shop-name text-center" style={{ width: '100%', display: 'block' }}>{shopSettings.name}</h1>
            <div style={{ height: '15px' }}></div>
            <p className="text-2xl font-bold m-1 font-nastaliq">ہمارے ہاں سنگاپور اور دبئی ورائٹی دستیاب ہے۔</p>
            <p className="text-lg m-1 font-nastaliq text-zinc-600">{shopSettings.address}</p>
            <div className="header-phone" dir="ltr">
              <div className="phone-brand-box">
                
                <span className="phone-number">{shopSettings.phone}</span>
              </div>
              {shopSettings.phone2 && (
                <div className="phone-brand-box-secondary">
                  
                  <span className="phone-number" style={{ color: '#800000' }}>{shopSettings.phone2}</span>
                </div>
              )}
            </div>
            <div className="bg-zinc-100 px-3 py-1 mt-4 font-bold rounded-lg text-gold text-lg font-nastaliq border border-gold-20 inline-block">کاریگر رسید</div>
          </div>

          <table className="receipt-table">
            <tbody>
              <tr>
                <th className="font-nastaliq" style={{ width: '25%' }}>کاریگر</th>
                <td className="font-nastaliq" style={{ width: '25%' }}>{karigar.name}</td>
                <th className="font-nastaliq" style={{ width: '25%' }}>تاریخ</th>
                <td className="font-mono" style={{ width: '25%' }}>{karigar.date}</td>
              </tr>
              <tr>
                <th className="font-nastaliq">فون</th>
                <td colSpan={3} className="font-mono" dir="ltr">{karigar.phone}</td>
              </tr>
            </tbody>
          </table>

          <table className="receipt-table" style={{ marginTop: '15px' }}>
            <tbody>
              <tr>
                <th className="font-nastaliq" style={{ width: '25%', background: '#f9f9f9' }}>ٹاسک (Task)</th>
                <td className="font-nastaliq" style={{ width: '75%', textAlign: 'right', paddingRight: '15px' }}>{karigar.task}</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-4">
            <table className="receipt-table">
              <thead>
                <tr>
                  <th className="font-nastaliq" style={{ width: '25%' }}>دیا گیا</th>
                  <th className="font-nastaliq" style={{ width: '25%' }}>وصول</th>
                  <th className="font-nastaliq" style={{ width: '25%' }}>کاٹ</th>
                  <th className="font-nastaliq" style={{ width: '25%' }}>صاف بقایا</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-mono">{karigar.given}g</td>
                  <td className="font-mono">{karigar.rec}g</td>
                  <td className="font-mono">{karigar.kaat}g</td>
                  <td className="text-red-600 font-bold font-mono">{karigar.net}g</td>
                </tr>
              </tbody>
            </table>
          </div>

          {karigar.img && (
            <div className="mt-4 text-center">
              <img src={karigar.img} alt="" className="max-h-48 mx-auto border border-zinc-200 rounded" />
            </div>
          )}

          <div className="flex justify-start opacity-50 pt-4 mt-4 border-t border-zinc-200" dir="ltr">
            <div className="w-20 h-20 border-4 border-red-800 rounded-full flex flex-col items-center justify-center text-red-800 p-1" style={{ transform: 'rotate(-15deg)' }}>
              <span className="font-sans text-[10px] font-black tracking-wider text-center uppercase leading-tight">{APP_CONFIG.shopNameEnglish}</span>
            </div>
          </div>
        </div>
    );
  }

    if (type === 'stock') {
      const stock = data as StockItem;
      return (
        <div ref={ref} className="print-receipt-container bg-white text-zinc-900" dir="rtl" style={{ 
          fontFamily: "'Inter', sans-serif", 
          width: '14.8cm', 
          minHeight: '21cm', 
          height: 'auto', 
          boxSizing: 'border-box', 
          position: 'relative', 
          padding: '0.5cm 1cm 1cm 1cm',
          paddingBottom: '2.5cm',
          backgroundColor: 'white'
        }}>
          {printStyles}
          <div className="receipt-border-decor" />
          <div className="header-section">
            <h1 className="shop-name text-center" style={{ width: '100%', display: 'block' }}>{shopSettings.name}</h1>
            <div style={{ height: '15px' }}></div>
            <p className="text-2xl font-bold m-1 font-nastaliq">ہمارے ہاں سنگاپور اور دبئی ورائٹی دستیاب ہے۔</p>
            <p className="text-lg m-1 font-nastaliq text-zinc-600">{shopSettings.address}</p>
            <div className="header-phone" dir="ltr">
              <div className="phone-brand-box">
                
                <span className="phone-number">{shopSettings.phone}</span>
              </div>
              {shopSettings.phone2 && (
                <div className="phone-brand-box-secondary">
                  
                  <span className="phone-number" style={{ color: '#800000' }}>{shopSettings.phone2}</span>
                </div>
              )}
            </div>
            <div className="bg-zinc-100 px-3 py-1 mt-4 font-bold rounded-lg text-gold text-lg font-nastaliq border border-gold-20 inline-block">اسٹاک رسید</div>
          </div>

          <table className="receipt-table" style={{ marginTop: '20px' }}>
            <tbody>
              <tr>
                <th className="font-nastaliq" style={{ width: '25%', background: '#f9f9f9' }}>آئٹم</th>
                <td className="font-bold text-xl font-nastaliq" style={{ width: '75%' }}>{stock.name}</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-4">
            <table className="receipt-table">
            <thead>
              <tr>
                <th className="font-nastaliq" style={{ width: '33%' }}>ٹائپ</th>
                <th className="font-nastaliq" style={{ width: '33%' }}>صاف وزن</th>
                <th className="font-nastaliq" style={{ width: '34%' }}>تعداد</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-nastaliq">{stock.type}</td>
                <td className="font-bold text-lg font-mono">{stock.quantity} {stock.unit}</td>
                <td className="font-bold text-lg font-mono">{stock.pieces || 0} pcs</td>
              </tr>
            </tbody>
          </table>
        </div>

          {stock.img && (
            <div className="mt-6 text-center">
              <img src={stock.img} alt="" className="max-h-64 mx-auto border border-zinc-200 rounded" />
            </div>
          )}

          <div className="flex justify-start opacity-50 pt-4 mt-4 border-t border-zinc-200" dir="ltr">
            <div className="w-20 h-20 border-4 border-red-800 rounded-full flex flex-col items-center justify-center text-red-800 p-1" style={{ transform: 'rotate(-15deg)' }}>
              <span className="font-sans text-[10px] font-black tracking-wider text-center uppercase leading-tight">{APP_CONFIG.shopNameEnglish}</span>
            </div>
          </div>
        </div>
    );
  }

  if (type === 'purchase') {
    const purchase = data as GoldPurchase;
    return (
      <div ref={ref} className="print-receipt-container bg-white text-zinc-900" dir="rtl" style={{ 
        fontFamily: "'Inter', sans-serif", 
        width: '21cm', 
        minHeight: '29.7cm', 
        height: 'auto', 
        boxSizing: 'border-box', 
        position: 'relative', 
        padding: '0.5cm 1cm 1cm 1cm',
        paddingBottom: '2.5cm',
        backgroundColor: 'white'
      }}>
        {printStyles}
        <div className="receipt-border-decor" />
        <div className="header-section">
          <h1 className="shop-name text-center" style={{ width: '100%', display: 'block' }}>{shopSettings.name}</h1>
          <div style={{ height: '15px' }}></div>
          <p className="text-2xl font-bold m-1 font-nastaliq">ہمارے ہاں سنگاپور اور دبئی ورائٹی دستیاب ہے۔</p>
          <p className="text-lg m-1 font-nastaliq text-zinc-600">{shopSettings.address}</p>
          <div className="header-phone" dir="ltr">
            <div className="phone-brand-box">
              
              <span className="phone-number">{shopSettings.phone}</span>
            </div>
            {shopSettings.phone2 && (
              <div className="phone-brand-box-secondary">
                
                <span className="phone-number" style={{ color: '#800000' }}>{shopSettings.phone2}</span>
              </div>
            )}
          </div>
          <div className="bg-zinc-100 px-3 py-1 mt-4 font-bold rounded-lg text-gold text-lg font-nastaliq border border-gold-20 inline-block">پرانا سونا خریداری رسید</div>
        </div>

        <table className="receipt-table">
          <tbody>
            <tr>
              <th className="font-nastaliq" style={{ width: '20%' }}>بیچنے والے کا نام</th>
              <td className="font-bold font-nastaliq" style={{ width: '30%' }}>{purchase.name}</td>
              <th className="font-nastaliq" style={{ width: '20%' }}>فون نمبر</th>
              <td className="font-bold" style={{ width: '30%' }} dir="ltr">{purchase.phone}</td>
            </tr>
            <tr>
              <th className="font-nastaliq">تاریخ</th>
              <td>{purchase.date}</td>
              <th className="font-nastaliq">رسید نمبر</th>
              <td className="font-bold text-gold">#{5000 + (id || 0)}</td>
            </tr>
          </tbody>
        </table>

        <table className="receipt-table" style={{ marginTop: '20px' }}>
          <thead>
            <tr>
              <th className="font-nastaliq" style={{ width: '30%', background: '#800000', color: 'white' }}>آئٹم</th>
              <th className="font-nastaliq" style={{ width: '20%', background: '#800000', color: 'white' }}>وزن</th>
              <th className="font-nastaliq" style={{ width: '25%', background: '#800000', color: 'white' }}>ریٹ</th>
              <th className="font-nastaliq" style={{ width: '25%', background: '#800000', color: 'white' }}>کل قیمت</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-nastaliq font-bold" style={{ paddingRight: '15px' }}>پرانا سونا</td>
              <td className="font-mono font-bold text-lg">{purchase.weight}g</td>
              <td className="font-mono">{purchase.rate.toLocaleString()}</td>
              <td className="font-mono font-bold text-lg">{purchase.total.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        {purchase.img && (
          <div className="mt-4 text-center">
            <h4 className="text-xs font-bold font-nastaliq mb-2">خریدے گئے سونے کی تصویر</h4>
            <img src={purchase.img} alt="" className="max-h-64 mx-auto border-2 border-zinc-200 rounded-xl shadow-sm" />
          </div>
        )}

        <div className="flex justify-start mt-6">
          <table className="summary-table" style={{ marginLeft: 'auto' }}>
            <tbody>
              <tr className="final-total-row">
                <th className="font-nastaliq font-black" style={{ fontSize: '18px' }}>نقد ادا شدہ رقم</th>
                <td className="font-black font-mono" style={{ fontSize: '24px' }}>Rs. {purchase.total.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-10 border-t-2 border-zinc-300 pt-6">
          <h3 className="text-center font-bold text-lg mb-4 font-nastaliq underline">اعلان و تصدیق</h3>
          <div className="text-[16px] leading-relaxed space-y-4 font-nastaliq text-justify mb-4">
            <p>
              فروخت کنندہ اس بات کی مکمل تصدیق کرتا/کرتی ہے کہ فروخت کیا جانے والا سونا اس کی جائز اور قانونی ملکیت ہے اور کسی بھی قسم کی چوری، گمشدگی یا غیر قانونی ذریعے سے حاصل شدہ نہیں ہے۔ فروخت کنندہ نے اپنی درست شناختی دستاویز (CNIC) فراہم کی ہے جس کی کاپی خریدار کے ریکارڈ میں محفوظ ہے۔
            </p>
            <p>
              خریدار (دکان) نے مناسب قانونی احتیاط (Due Diligence) کے طور پر شناخت، تصویر اور لین دین کا مکمل ریکارڈ محفوظ کیا ہے۔ اگر مستقبل میں یہ سونا چوری شدہ یا غیر قانونی ثابت ہوتا ہے تو اس کی مکمل قانونی ذمہ داری فروخت کنندہ پر عائد ہوگی اور وہ ہر قسم کے نقصان، دعویٰ یا قانونی کارروائی کا ذمہ دار ہوگا۔
            </p>
          </div>
          <div className="text-[14px] leading-tight space-y-3 mb-8 text-justify font-sans text-zinc-700 italic border-b border-zinc-200 pb-6">
            <p>
              The seller hereby declares that the gold being sold is his/her lawful property and is not stolen, lost, or obtained through any illegal means. A valid CNIC has been provided and a copy is retained in the buyer’s records.
            </p>
            <p>
              The buyer (shop) has exercised due diligence by recording identification details, photograph, and transaction data. In the event that the gold is later found to be stolen or illegal, full legal responsibility and liability shall rest with the seller, including compensation for any loss or legal claim.
            </p>
          </div>
          
          <div className="mt-12 grid grid-cols-2 gap-y-10 text-[13px] font-bold font-nastaliq">
            <div className="border-b border-zinc-400 pb-1">فروخت کنندہ کے دستخط:</div>
            <div className="border-b border-zinc-400 pb-1 text-left">انگوٹھے کا نشان:</div>
            <div className="border-b border-zinc-400 pb-1">شناختی کارڈ:</div>
            <div className="border-b border-zinc-400 pb-1 text-left">موبائل نمبر:</div>
            <div className="col-span-2 text-center mt-6 border-b border-zinc-400 pb-1 inline-block mx-auto px-12">تاریخ: {purchase.date}</div>
          </div>
        </div>

        <div className="flex justify-start opacity-50 pt-4 mt-8" dir="ltr">
            <div className="w-20 h-20 border-4 border-red-800 rounded-full flex flex-col items-center justify-center text-red-800 p-1" style={{ transform: 'rotate(-15deg)' }}>
              <span className="font-sans text-[10px] font-black tracking-wider text-center uppercase leading-tight">{APP_CONFIG.shopNameEnglish}</span>
            </div>
          </div>
      </div>
    );
  }

  return null;
});

PrintReceipt.displayName = 'PrintReceipt';
