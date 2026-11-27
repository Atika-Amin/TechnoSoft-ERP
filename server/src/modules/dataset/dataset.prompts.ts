// Builds the sentences / scenarios people record.
// Same seed + mode → same prompt, so the server never has to trust labels sent by the browser.

export type Mode = 'read' | 'scenario';
export type VoucherType = 'CP' | 'CR' | 'BP' | 'BR';
type DateWord = 'today' | 'yesterday';

export interface Label {
  type: VoucherType;
  date: DateWord;
  bank: string | null; // English bank name for BP / BR
  lines: { account: string; spoken: string; amount: number }[];
}

export interface Prompt {
  seed: number;
  mode: Mode;
  text: string; // read: the exact sentence · scenario: a short summary
  card: { typeLabel: string; dateLabel: string; bank: string | null; lines: { account: string; amount: string }[] };
  label: Label;
}

// ── Bangla number words ──
const UNDER_100 = (
  ' এক দুই তিন চার পাঁচ ছয় সাত আট নয় দশ এগারো বারো তেরো চৌদ্দ পনেরো ষোলো সতেরো আঠারো উনিশ বিশ ' +
  'একুশ বাইশ তেইশ চব্বিশ পঁচিশ ছাব্বিশ সাতাশ আটাশ উনত্রিশ ত্রিশ একত্রিশ বত্রিশ তেত্রিশ চৌত্রিশ পঁয়ত্রিশ ছত্রিশ সাঁইত্রিশ আটত্রিশ উনচল্লিশ চল্লিশ ' +
  'একচল্লিশ বিয়াল্লিশ তেতাল্লিশ চুয়াল্লিশ পঁয়তাল্লিশ ছেচল্লিশ সাতচল্লিশ আটচল্লিশ উনপঞ্চাশ পঞ্চাশ একান্ন বাহান্ন তিপ্পান্ন চুয়ান্ন পঞ্চান্ন ছাপ্পান্ন সাতান্ন আটান্ন উনষাট ষাট ' +
  'একষট্টি বাষট্টি তেষট্টি চৌষট্টি পঁয়ষট্টি ছেষট্টি সাতষট্টি আটষট্টি উনসত্তর সত্তর একাত্তর বাহাত্তর তিয়াত্তর চুয়াত্তর পঁচাত্তর ছিয়াত্তর সাতাত্তর আটাত্তর উনআশি আশি ' +
  'একাশি বিরাশি তিরাশি চুরাশি পঁচাশি ছিয়াশি সাতাশি আটাশি উননব্বই নব্বই একানব্বই বিরানব্বই তিরানব্বই চুরানব্বই পঁচানব্বই ছিয়ানব্বই সাতানব্বই আটানব্বই নিরানব্বই'
).split(' ');

// 150000 → "এক লাখ পঞ্চাশ হাজার" (or "দেড় লাখ" when allowed)
export function banglaWords(n: number, casual = false): string {
  if (casual) {
    if (n === 150000) return 'দেড় লাখ';
    if (n === 250000) return 'আড়াই লাখ';
    if (n === 1500) return 'দেড় হাজার';
    if (n === 2500) return 'আড়াই হাজার';
  }
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = Math.floor((n % 1000) / 100);
  const rest = n % 100;
  if (crore) parts.push(`${banglaWords(crore)} কোটি`);
  if (lakh) parts.push(`${UNDER_100[lakh]} লাখ`);
  if (thousand) parts.push(`${UNDER_100[thousand]} হাজার`);
  if (hundred) parts.push(`${UNDER_100[hundred]}শো`);
  if (rest) parts.push(UNDER_100[rest]);
  return parts.join(' ') || 'শূন্য';
}

// 150000 → "১,৫০,০০০" (lakh grouping, Bangla digits)
export function banglaDigits(n: number): string {
  const s = String(n);
  const last3 = s.slice(-3);
  const front = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (front ? `${front},${last3}` : last3).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);
}

// ── Vocabulary (general business, not one company's chart) ──
const EXPENSES: [string, string[]][] = [
  ['Office Rent', ['অফিস ভাড়া', 'office rent']],
  ['Salary', ['বেতন', 'স্টাফদের বেতন', 'salary']],
  ['Electricity Bill', ['বিদ্যুৎ বিল', 'কারেন্ট বিল', 'electricity bill']],
  ['Gas Bill', ['গ্যাস বিল']],
  ['Water Bill', ['পানির বিল']],
  ['Internet Bill', ['ইন্টারনেট বিল', 'internet bill']],
  ['Mobile Bill', ['মোবাইল বিল']],
  ['Transport', ['গাড়ি ভাড়া', 'যাতায়াত খরচ', 'transport']],
  ['Fuel', ['তেল খরচ', 'fuel']],
  ['Entertainment', ['আপ্যায়ন খরচ', 'চা নাস্তা']],
  ['Stationery', ['স্টেশনারি', 'কাগজ কলম']],
  ['Fabric Purchase', ['কাপড় কেনা', 'fabric purchase']],
  ['Raw Material Purchase', ['কাঁচামাল কেনা']],
  ['Machine Repair', ['মেশিন মেরামত', 'machine repair']],
  ['Wages', ['শ্রমিকদের মজুরি', 'wages']],
];
const INCOME: [string, string[]][] = [
  ['Sales', ['বিক্রি', 'মাল বিক্রি', 'sales']],
  ['Service Charge', ['সার্ভিস চার্জ']],
  ['Rent Received', ['ভাড়া আদায়']],
];
const PARTIES: [string, string][] = [
  ['Rahim', 'রহিম'],
  ['Karim', 'করিম'],
  ['Jamal Traders', 'জামাল ট্রেডার্স'],
  ['H&M', 'H&M'],
  ['Al-Amin Enterprise', 'আল-আমিন এন্টারপ্রাইজ'],
  ['Salma', 'সালমা'],
  ['New Market Store', 'নিউ মার্কেট স্টোর'],
  ['Hasan Fabrics', 'হাসান ফেব্রিক্স'],
];
const BANKS: [string, string][] = [
  ['Dutch-Bangla Bank', 'ডাচ-বাংলা ব্যাংক'],
  ['Sonali Bank', 'সোনালী ব্যাংক'],
  ['BRAC Bank', 'ব্র্যাক ব্যাংক'],
  ['Islami Bank', 'ইসলামী ব্যাংক'],
  ['Pubali Bank', 'পূবালী ব্যাংক'],
  ['City Bank', 'সিটি ব্যাংক'],
];
const TYPE_LABEL: Record<VoucherType, string> = {
  CP: 'নগদ পরিশোধ · Cash payment',
  CR: 'নগদ গ্রহণ · Cash received',
  BP: 'ব্যাংক পরিশোধ · Bank payment',
  BR: 'ব্যাংকে গ্রহণ · Bank received',
};

// Small seeded random generator (mulberry32)
function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T>(list: readonly T[]) => list[Math.floor(next() * list.length)];
  return { next, pick };
}

// Mostly round amounts, sometimes exact ones like 12,750
function amount(r: ReturnType<typeof rng>): number {
  const roll = r.next();
  if (roll < 0.35) return r.pick([500, 1000, 1500, 2000, 2500, 3000, 5000, 8000]);
  if (roll < 0.7) return Math.round(5 + r.next() * 95) * 1000; // 5,000 – 1,00,000
  if (roll < 0.85) return r.pick([150000, 250000, 300000, 500000, 1200000]);
  return Math.round((1000 + r.next() * 49000) / 50) * 50; // odd amounts like 12,750
}

const bankAt = (bn: string) => bn.replace(/ব্যাংক$/, 'ব্যাংকে'); // "ডাচ-বাংলা ব্যাংকে"

export function buildPrompt(seed: number, mode: Mode): Prompt {
  const r = rng(seed);
  const type = r.pick<VoucherType>(['CP', 'CP', 'CP', 'CR', 'CR', 'BP', 'BR']); // cash payments are the most common
  const date = r.pick<DateWord>(['today', 'today', 'yesterday']);
  const dateWord = date === 'today' ? r.pick(['আজকে', 'আজ', '']) : 'গতকাল';
  const bank = type === 'BP' || type === 'BR' ? r.pick(BANKS) : null;
  const words = (n: number) => banglaWords(n, r.next() < 0.5);
  const lines: Label['lines'] = [];
  let text = '';

  // Payments either go to an expense head or settle a party's dues
  const partyPay = r.next() < 0.3;
  const [pEn, pBn] = r.pick(PARTIES);

  if (type === 'CP') {
    if (partyPay) {
      const a = amount(r);
      lines.push({ account: pEn, spoken: pBn, amount: a });
      text = `${dateWord} ${pBn} এর পাওনা ${words(a)} টাকা নগদ পরিশোধ করলাম`;
    } else if (r.next() < 0.25) {
      // two lines in one voucher
      const [e1, b1] = r.pick(EXPENSES);
      let [e2, b2] = r.pick(EXPENSES);
      if (e2 === e1) [e2, b2] = EXPENSES[(EXPENSES.findIndex((x) => x[0] === e1) + 1) % EXPENSES.length];
      const s1 = r.pick(b1);
      const s2 = r.pick(b2);
      const a1 = amount(r);
      const a2 = amount(r);
      lines.push({ account: e1, spoken: s1, amount: a1 }, { account: e2, spoken: s2, amount: a2 });
      text = `${dateWord} ${s1} ${words(a1)} টাকা আর ${s2} ${words(a2)} টাকা ক্যাশ দিলাম`;
    } else {
      const [en, bn] = r.pick(EXPENSES);
      const spoken = r.pick(bn);
      const a = amount(r);
      lines.push({ account: en, spoken, amount: a });
      text = r.pick([
        `${dateWord} ${spoken} বাবদ ${words(a)} টাকা ক্যাশ দিলাম`,
        `${dateWord} নগদ ${words(a)} টাকা ${spoken} দেওয়া হলো`,
        `${dateWord} ${spoken} এর জন্য ক্যাশ থেকে ${words(a)} টাকা খরচ করলাম`,
        `${dateWord} ${spoken} ${words(a)} টাকা cash payment করলাম`,
      ]);
    }
  } else if (type === 'CR') {
    const a = amount(r);
    if (r.next() < 0.6) {
      lines.push({ account: pEn, spoken: pBn, amount: a });
      text = r.pick([
        `${dateWord} ${pBn} এর কাছ থেকে নগদ ${words(a)} টাকা পেলাম`,
        `${dateWord} ${pBn} ক্যাশে ${words(a)} টাকা দিয়েছে`,
      ]);
    } else {
      const [en, bn] = r.pick(INCOME);
      const spoken = r.pick(bn);
      lines.push({ account: en, spoken, amount: a });
      text = `${dateWord} ${spoken} বাবদ ক্যাশে ${words(a)} টাকা জমা হলো`;
    }
  } else if (type === 'BP') {
    const a = amount(r);
    if (partyPay) {
      lines.push({ account: pEn, spoken: pBn, amount: a });
      text = `${dateWord} ${bank![1]} এর চেক দিয়ে ${pBn} কে ${words(a)} টাকা পেমেন্ট করলাম`;
    } else {
      const [en, bn] = r.pick(EXPENSES);
      const spoken = r.pick(bn);
      lines.push({ account: en, spoken, amount: a });
      text = `${dateWord} ${bank![1]} থেকে চেকে ${spoken} বাবদ ${words(a)} টাকা দিলাম`;
    }
  } else {
    const a = amount(r);
    lines.push({ account: pEn, spoken: pBn, amount: a });
    text = r.pick([
      `${dateWord} ${pBn} ${bankAt(bank![1])} ${words(a)} টাকা পাঠিয়েছে`,
      `${dateWord} ${bankAt(bank![1])} ${pBn} এর চেক জমা হলো ${words(a)} টাকা`,
    ]);
  }

  const label: Label = { type, date, bank: bank?.[0] ?? null, lines };
  const card = {
    typeLabel: TYPE_LABEL[type],
    dateLabel: date === 'today' ? 'আজ · Today' : 'গতকাল · Yesterday',
    bank: bank ? `${bank[1]} · ${bank[0]}` : null,
    lines: lines.map((l) => ({ account: l.spoken === l.account ? l.account : `${l.spoken} · ${l.account}`, amount: `৳ ${banglaDigits(l.amount)}` })),
  };
  if (mode === 'scenario') {
    text = `${card.typeLabel} — ${lines.map((l) => `${l.spoken} ${banglaDigits(l.amount)}`).join(', ')}`;
  }
  return { seed, mode, text: text.replace(/\s+/g, ' ').trim(), card, label };
}
