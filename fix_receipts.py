import re

with open('src/components/PrintReceipt.tsx', 'r') as f:
    content = f.read()

# 1. Sale
sale_pattern = r'<div className="terms font-nastaliq">(.*?)</div>\s*<div className="receipt-footer">.*?<div className="w-20 h-20 border-4 border-red-800 rounded-full flex flex-col items-center justify-center text-red-800 p-1" style=\{\{ transform: \'rotate\(-15deg\)\' \}\}>(.*?)</div>.*?</div>\s*</div>'
sale_replacement = r'''<div className="flex justify-between items-start terms-container border-t border-zinc-300 pt-4 mt-6">
            <div className="terms font-nastaliq" style={{ border: 'none', marginTop: 0, paddingTop: 0, width: '70%' }}>\1</div>
            <div className="w-[30%] flex justify-end opacity-50" dir="ltr">
              <div className="w-20 h-20 border-4 border-red-800 rounded-full flex flex-col items-center justify-center text-red-800 p-1" style={{ transform: 'rotate(-15deg)' }}>
                <span className="font-sans text-[10px] font-black tracking-wider text-center uppercase leading-tight">{APP_CONFIG.shopNameEnglish}</span>
              </div>
            </div>
          </div>'''
content = re.sub(sale_pattern, sale_replacement, content, flags=re.DOTALL)

# 2. Order
order_pattern = r'<div className="terms font-nastaliq" style=\{\{ fontSize: \'10px\', marginTop: \'10px\', paddingTop: \'6px\' \}\}>(.*?)</div>\s*<div className="receipt-footer" style=\{\{ marginTop: \'15px\' \}\}>.*?<div className="w-20 h-20 border-4 border-red-800 rounded-full flex flex-col items-center justify-center text-red-800 p-1" style=\{\{ transform: \'rotate\(-15deg\)\' \}\}>(.*?)</div>.*?</div>\s*</div>'
order_replacement = r'''<div className="flex justify-between items-start terms-container border-t border-zinc-300 pt-4 mt-4">
            <div className="terms font-nastaliq" style={{ border: 'none', marginTop: 0, paddingTop: 0, width: '70%', fontSize: '10px' }}>\1</div>
            <div className="w-[30%] flex justify-end opacity-50" dir="ltr">
              <div className="w-20 h-20 border-4 border-red-800 rounded-full flex flex-col items-center justify-center text-red-800 p-1" style={{ transform: 'rotate(-15deg)' }}>
                <span className="font-sans text-[10px] font-black tracking-wider text-center uppercase leading-tight">{APP_CONFIG.shopNameEnglish}</span>
              </div>
            </div>
          </div>'''
content = re.sub(order_pattern, order_replacement, content, flags=re.DOTALL)

# 3. Repair
repair_pattern = r'<p className="mt-10 pt-4 border-t border-zinc-300 text-\[14px\] font-nastaliq text-zinc-600">(.*?)</p>\s*<div className="receipt-footer">.*?<div className="w-20 h-20 border-4 border-red-800 rounded-full flex flex-col items-center justify-center text-red-800 p-1" style=\{\{ transform: \'rotate\(-15deg\)\' \}\}>(.*?)</div>.*?</div>\s*</div>'
repair_replacement = r'''<div className="flex justify-between items-start terms-container border-t border-zinc-300 pt-4 mt-6">
            <p className="text-[14px] font-nastaliq text-zinc-600" style={{ width: '70%' }}>\1</p>
            <div className="w-[30%] flex justify-end opacity-50" dir="ltr">
              <div className="w-20 h-20 border-4 border-red-800 rounded-full flex flex-col items-center justify-center text-red-800 p-1" style={{ transform: 'rotate(-15deg)' }}>
                <span className="font-sans text-[10px] font-black tracking-wider text-center uppercase leading-tight">{APP_CONFIG.shopNameEnglish}</span>
              </div>
            </div>
          </div>'''
content = re.sub(repair_pattern, repair_replacement, content, flags=re.DOTALL)

# 4. Karigar
karigar_pattern = r'<div className="receipt-footer">.*?<div className="w-20 h-20 border-4 border-red-800 rounded-full flex flex-col items-center justify-center text-red-800 p-1" style=\{\{ transform: \'rotate\(-15deg\)\' \}\}>(.*?)</div>.*?</div>\s*</div>'
karigar_replacement = r'''<div className="flex justify-end opacity-50 pt-4 mt-4 border-t border-zinc-200" dir="ltr">
            <div className="w-20 h-20 border-4 border-red-800 rounded-full flex flex-col items-center justify-center text-red-800 p-1" style={{ transform: 'rotate(-15deg)' }}>
              <span className="font-sans text-[10px] font-black tracking-wider text-center uppercase leading-tight">{APP_CONFIG.shopNameEnglish}</span>
            </div>
          </div>'''
# Replace only the first occurrence for karigar (since it matches stock too)
# Actually, wait, let's just replace all remaining ones globally.
content = re.sub(karigar_pattern, karigar_replacement, content, flags=re.DOTALL)

# 5. Purchase
purchase_pattern = r'<div className="receipt-footer" style=\{\{ marginTop: \'50px\' \}\}>.*?<div className="w-20 h-20 border-4 border-red-800 rounded-full flex flex-col items-center justify-center text-red-800 p-1" style=\{\{ transform: \'rotate\(-15deg\)\' \}\}>(.*?)</div>.*?</div>\s*</div>'
purchase_replacement = r'''<div className="flex justify-end opacity-50 pt-4 mt-8" dir="ltr">
            <div className="w-20 h-20 border-4 border-red-800 rounded-full flex flex-col items-center justify-center text-red-800 p-1" style={{ transform: 'rotate(-15deg)' }}>
              <span className="font-sans text-[10px] font-black tracking-wider text-center uppercase leading-tight">{APP_CONFIG.shopNameEnglish}</span>
            </div>
          </div>'''
content = re.sub(purchase_pattern, purchase_replacement, content, flags=re.DOTALL)


with open('src/components/PrintReceipt.tsx', 'w') as f:
    f.write(content)
