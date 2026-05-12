// =========================================================================
// MINI CURRENCY CONVERTER (app.js) - "FLOAT"
// Uses REAL-TIME API: https://api.exchangerate-api.com/v4/latest/USD
// Includes MYANMAR KYAT (MMK) + all major currencies
// Auto-refresh every 10 minutes + manual refresh button
// =========================================================================

// ---------- CURRENCY DATABASE (with flags / symbols) ----------
const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", flag: "🇯🇵" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", flag: "🇨🇦" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", flag: "🇦🇺" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", flag: "🇨🇭" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", flag: "🇨🇳" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", flag: "🇮🇳" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", flag: "🇧🇷" },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$", flag: "🇲🇽" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", flag: "🇸🇬" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", flag: "🇳🇿" },
  { code: "KRW", name: "South Korean Won", symbol: "₩", flag: "🇰🇷" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", flag: "🇹🇷" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽", flag: "🇷🇺" },
  { code: "ZAR", name: "South African Rand", symbol: "R", flag: "🇿🇦" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", flag: "🇦🇪" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", flag: "🇭🇰" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", flag: "🇸🇪" },
  { code: "THB", name: "Thai Baht", symbol: "฿", flag: "🇹🇭" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", flag: "🇲🇾" },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", flag: "🇻🇳" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱", flag: "🇵🇭" },
  // ----- MYANMAR KYAT (proudly featured) -----
  { code: "MMK", name: "Myanmar Kyat", symbol: "K", flag: "🇲🇲" }
];

// Map for quick symbol and name lookup
const currencyMetadata = new Map();
CURRENCIES.forEach(curr => {
  currencyMetadata.set(curr.code, { symbol: curr.symbol, name: curr.name, flag: curr.flag });
});

// ---------- DOM elements ----------
const fromSelect = document.getElementById('fromCurrency');
const toSelect = document.getElementById('toCurrency');
const amountInput = document.getElementById('amountInput');
const convertBtn = document.getElementById('convertBtn');
const swapBtn = document.getElementById('swapBtn');
const manualRefreshBtn = document.getElementById('manualRefreshBtn');
const convertedSpan = document.getElementById('convertedAmount');
const toSymbolSpan = document.getElementById('toSymbol');
const rateDisplaySpan = document.getElementById('rateDisplay');
const inverseHintSpan = document.getElementById('inverseHint');
const rateTimestampSpan = document.getElementById('rateTimestamp');
const statusDot = document.getElementById('statusDot');
const specialNoteSpan = document.getElementById('specialNote');

// ---------- Global state ----------
let exchangeRates = null;         // Stores { USD: 1, EUR: 0.94, MMK: 2100.5, ... }
let lastFetchTime = null;
let isFetching = false;
let refreshInterval = null;

// ---------- Helper: Populate dropdowns with full currency list (including MMK) ----------
function populateSelectors() {
  fromSelect.innerHTML = '';
  toSelect.innerHTML = '';

  // Sort alphabetically by code for better UX
  const sorted = [...CURRENCIES].sort((a, b) => a.code.localeCompare(b.code));
  
  sorted.forEach(currency => {
    const optionFrom = document.createElement('option');
    optionFrom.value = currency.code;
    optionFrom.textContent = `${currency.flag} ${currency.code} - ${currency.name}`;
    
    const optionTo = document.createElement('option');
    optionTo.value = currency.code;
    optionTo.textContent = `${currency.flag} ${currency.code} - ${currency.name}`;
    
    fromSelect.appendChild(optionFrom);
    toSelect.appendChild(optionTo);
  });
  
  // Set smarter defaults: USD → MMK (show Myanmar kyat right away)
  fromSelect.value = 'USD';
  toSelect.value = 'MMK';
}

// ---------- Real-time API call (exchangerate-api.com free, no key required) ----------
async function fetchRealTimeRates() {
  if (isFetching) {
    rateTimestampSpan.innerHTML = "⏳ ငွေလဲနှုန်းများ ရယူနေဆဲ...";
    return false;
  }
  
  isFetching = true;
  statusDot.className = "w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse";
  rateTimestampSpan.innerHTML = "🌐 တိုက်ရိုက်ငွေလဲနှုန်းများ ရယူနေသည်...";
  
  try {
    // Using free tier exchange rate API that supports MMK
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    if (data && data.rates && typeof data.rates === 'object') {
      exchangeRates = data.rates;
      exchangeRates['USD'] = 1;   // Ensure base is exactly 1
      
      // Double-check MMK inclusion
      if (!exchangeRates['MMK']) {
        exchangeRates['MMK'] = 2100.0;
        console.warn("MMK not in API response, using market fallback.");
      }
      
      lastFetchTime = new Date();
      const formattedTime = lastFetchTime.toLocaleTimeString('my', { hour: '2-digit', minute: '2-digit', second:'2-digit' });
      const mmkRate = exchangeRates['MMK'].toFixed(2);
      rateTimestampSpan.innerHTML = `✅ တိုက်ရိုက်နှုန်း • ${formattedTime} • 1 USD = ${mmkRate} MMK`;
      statusDot.className = "w-1.5 h-1.5 rounded-full bg-green-500";
      
      if (specialNoteSpan) specialNoteSpan.innerHTML = `🇲🇲 MMK live: ${mmkRate} K/USD`;
      return true;
    } else {
      throw new Error("Invalid API response structure");
    }
  } catch (error) {
    console.error("API error:", error);
    rateTimestampSpan.innerHTML = "⚠️ အင်တာနက်ချိတ်ဆက်မှု စစ်ဆေးပါ။ ယာယီနှုန်းများသုံးနေသည်။";
    statusDot.className = "w-1.5 h-1.5 rounded-full bg-red-500";
    
    // FALLBACK rates (robust offline mode with realistic values, includes MMK)
    if (!exchangeRates) {
      exchangeRates = {
        USD: 1, EUR: 0.93, GBP: 0.79, JPY: 148.2, CAD: 1.36, AUD: 1.52,
        CHF: 0.89, CNY: 7.23, INR: 83.6, BRL: 5.11, MXN: 16.90, SGD: 1.34,
        NZD: 1.66, KRW: 1340, TRY: 32.3, RUB: 91.8, ZAR: 18.5, AED: 3.67,
        HKD: 7.82, SEK: 10.60, THB: 36.3, MYR: 4.74, VND: 25480, PHP: 56.2,
        MMK: 2100.0
      };
      lastFetchTime = new Date();
    }
    return false;
  } finally {
    isFetching = false;
  }
}

// ---------- Core Conversion Logic (USD base) ----------
function convertAmount(amount, fromCode, toCode) {
  if (!exchangeRates) return null;
  const fromRate = exchangeRates[fromCode];
  const toRate = exchangeRates[toCode];
  if (!fromRate || !toRate) return null;
  const amountInUSD = amount / fromRate;
  return amountInUSD * toRate;
}

// Format numbers based on currency style
function formatCurrencyValue(value, currencyCode) {
  if (value === null || isNaN(value) || !isFinite(value)) return '?';
  const highValueNoDecimal = ['JPY', 'KRW', 'VND', 'IDR'];
  if (highValueNoDecimal.includes(currencyCode)) {
    return Math.round(value).toFixed(0);
  }
  if (currencyCode === 'MMK') {
    return value.toFixed(2);
  }
  return value.toFixed(2);
}

// ---------- Update UI: perform live conversion based on latest rates ----------
async function updateConversionUI() {
  if (!exchangeRates) {
    await fetchRealTimeRates();
    if (!exchangeRates) {
      convertedSpan.textContent = 'ERR';
      rateDisplaySpan.innerHTML = 'နှုန်းမရှိ';
      return;
    }
  }
  
  let amount = parseFloat(amountInput.value);
  if (isNaN(amount) || amount === null) amount = 0;
  if (amount < 0) amount = Math.abs(amount);
  amountInput.value = amount;
  
  const fromCurr = fromSelect.value;
  const toCurr = toSelect.value;
  
  // Same currency edge case
  if (fromCurr === toCurr) {
    const formattedSame = formatCurrencyValue(amount, toCurr);
    convertedSpan.textContent = formattedSame;
    const sym = currencyMetadata.get(toCurr)?.symbol || toCurr;
    toSymbolSpan.textContent = sym;
    rateDisplaySpan.innerHTML = `1 ${fromCurr} = 1.0000 ${toCurr}`;
    inverseHintSpan.innerHTML = `↻ 1 ${toCurr} = 1.0000 ${fromCurr}`;
    return;
  }
  
  const convertedRaw = convertAmount(amount, fromCurr, toCurr);
  if (convertedRaw !== null && isFinite(convertedRaw)) {
    const formattedResult = formatCurrencyValue(convertedRaw, toCurr);
    convertedSpan.textContent = formattedResult;
    const targetSymbol = currencyMetadata.get(toCurr)?.symbol || toCurr;
    toSymbolSpan.textContent = targetSymbol;
    
    const rate = convertedRaw / amount;
    const rateFormatted = rate.toFixed(4);
    rateDisplaySpan.innerHTML = `1 ${fromCurr} = ${rateFormatted} ${toCurr}`;
    
    const inverseRate = 1 / rate;
    const inverseFormatted = inverseRate.toFixed(4);
    inverseHintSpan.innerHTML = `↻ 1 ${toCurr} = ${inverseFormatted} ${fromCurr}`;
    
    // Update special note for MMK pair
    if (toCurr === 'MMK' && fromCurr === 'USD') {
      specialNoteSpan.innerHTML = `🇲🇲 1 USD ≈ ${rateFormatted} ကျပ် (တိုက်ရိုက်)`;
    } else if (fromCurr === 'MMK' && toCurr === 'USD') {
      specialNoteSpan.innerHTML = `💵 1 MMK ≈ ${inverseFormatted} USD`;
    } else if (toCurr === 'MMK' || fromCurr === 'MMK') {
      specialNoteSpan.innerHTML = `🇲🇲 မြန်မာကျပ် တိုက်ရိုက်နှုန်း`;
    } else {
      specialNoteSpan.innerHTML = `⚡ တိုက်ရိုက် API • ${new Date().toLocaleTimeString('my')}`;
    }
  } else {
    convertedSpan.textContent = '?';
    toSymbolSpan.textContent = '';
    rateDisplaySpan.innerHTML = 'နှုန်းမရှိ';
    inverseHintSpan.innerHTML = 'အခြားငွေကြေးကို ရွေးပါ';
  }
}

// ---------- Swap "From" and "To" currencies ----------
function swapCurrencies() {
  const tempFrom = fromSelect.value;
  const tempTo = toSelect.value;
  fromSelect.value = tempTo;
  toSelect.value = tempFrom;
  updateConversionUI();
  swapBtn.classList.add('scale-90');
  setTimeout(() => swapBtn.classList.remove('scale-90'), 120);
}

// ---------- Manual refresh (force API call) ----------
async function manualRefresh() {
  rateTimestampSpan.innerHTML = "🔄 ငွေလဲနှုန်းများ ပြန်လည်ရယူနေသည်...";
  statusDot.className = "w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse";
  await fetchRealTimeRates();
  await updateConversionUI();
}

// ---------- Auto refresh every 10 minutes ----------
function startAutoRefresh() {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(async () => {
    console.log("Auto-refreshing forex rates...");
    await fetchRealTimeRates();
    await updateConversionUI();
  }, 10 * 60 * 1000);
}

// ---------- Event Listeners ----------
function bindEvents() {
  convertBtn.addEventListener('click', (e) => {
    e.preventDefault();
    updateConversionUI();
  });
  swapBtn.addEventListener('click', (e) => {
    e.preventDefault();
    swapCurrencies();
  });
  manualRefreshBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await manualRefresh();
  });
  fromSelect.addEventListener('change', () => updateConversionUI());
  toSelect.addEventListener('change', () => updateConversionUI());
  amountInput.addEventListener('input', () => updateConversionUI());
  amountInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') updateConversionUI();
  });
}

// ---------- Initialization ----------
async function initApp() {
  populateSelectors();
  bindEvents();
  convertedSpan.textContent = "⟳";
  rateDisplaySpan.innerHTML = "ဖွင့်နေသည်...";
  await fetchRealTimeRates();
  await updateConversionUI();
  startAutoRefresh();
}

// Start the app
initApp();