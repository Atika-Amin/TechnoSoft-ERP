// Fills the database with an admin user and a sample garments-company chart of accounts.
// Run with:  npx prisma db seed
// Safe to run again: existing rows with the same code are overwritten with this data.
import 'dotenv/config';
import { PrismaMssql } from '@prisma/adapter-mssql';
import bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({ adapter: new PrismaMssql(process.env.DATABASE_URL!) });

// FoxPro number codes
const NAT = { ASSETS: 1, LIABILITY: 2, INCOME: 3, EXPENSE: 4 }; // lednat
const ST = { NONE: 0, TRADING: 1, MANUFACTURING: 2, PROFIT_LOSS: 3 }; // tmpa
const TYPE = { CASH: 1, BANK: 2, STORE: 3, PARTY: 4, NONE: 5, PROJECT: 6 }; // codesign

// [code, name, nature, statement, ledgerType]
const GROUPS: [string, string, number, number, number][] = [
  ['100001', 'Fixed Assets', NAT.ASSETS, ST.NONE, TYPE.NONE],
  ['100002', 'Current Assets', NAT.ASSETS, ST.NONE, TYPE.NONE],
  ['100003', 'Capital Account', NAT.LIABILITY, ST.NONE, TYPE.NONE],
  ['100004', 'Current Liabilities', NAT.LIABILITY, ST.NONE, TYPE.NONE],
  ['100005', 'Long Term Loans', NAT.LIABILITY, ST.NONE, TYPE.NONE],
  ['100006', 'Sales', NAT.INCOME, ST.TRADING, TYPE.NONE],
  ['100007', 'Other Income', NAT.INCOME, ST.PROFIT_LOSS, TYPE.NONE],
  ['100008', 'Direct Expenses', NAT.EXPENSE, ST.MANUFACTURING, TYPE.NONE],
  ['100009', 'Purchase', NAT.EXPENSE, ST.TRADING, TYPE.NONE],
  ['100010', 'Indirect Expenses', NAT.EXPENSE, ST.PROFIT_LOSS, TYPE.NONE],
];

// [code, name, parent group, nature, statement, ledgerType]
const SUB_GROUPS: [string, string, string, number, number, number][] = [
  ['100011', 'Plant & Machinery', '100001', NAT.ASSETS, ST.NONE, TYPE.NONE],
  ['100012', 'Furniture & Fixtures', '100001', NAT.ASSETS, ST.NONE, TYPE.NONE],
  ['100013', 'Cash in Hand', '100002', NAT.ASSETS, ST.NONE, TYPE.CASH],
  ['100014', 'Bank Accounts', '100002', NAT.ASSETS, ST.NONE, TYPE.BANK],
  ['100015', 'Sundry Debtors (Buyers)', '100002', NAT.ASSETS, ST.NONE, TYPE.PARTY],
  ['100016', 'Stock in Hand', '100002', NAT.ASSETS, ST.NONE, TYPE.STORE],
  ['100017', 'Work in Progress (Orders)', '100002', NAT.ASSETS, ST.NONE, TYPE.PROJECT],
  ['100018', "Owner's Capital", '100003', NAT.LIABILITY, ST.NONE, TYPE.NONE],
  ['100019', 'Sundry Creditors (Suppliers)', '100004', NAT.LIABILITY, ST.NONE, TYPE.PARTY],
  ['100020', 'Bank Loans', '100005', NAT.LIABILITY, ST.NONE, TYPE.BANK],
  ['100021', 'Export Sales', '100006', NAT.INCOME, ST.TRADING, TYPE.NONE],
  ['100022', 'Interest & Other Income', '100007', NAT.INCOME, ST.PROFIT_LOSS, TYPE.NONE],
  ['100023', 'Factory Overheads', '100008', NAT.EXPENSE, ST.MANUFACTURING, TYPE.NONE],
  ['100024', 'Production Wages', '100008', NAT.EXPENSE, ST.MANUFACTURING, TYPE.CASH],
  ['100025', 'Raw Material Purchase', '100009', NAT.EXPENSE, ST.TRADING, TYPE.NONE],
  ['100026', 'Administrative Expenses', '100010', NAT.EXPENSE, ST.PROFIT_LOSS, TYPE.NONE],
  ['100027', 'Selling & Distribution', '100010', NAT.EXPENSE, ST.PROFIT_LOSS, TYPE.NONE],
];

// [code, name, parent sub group, opening balance (+ Debit, − Credit)]
// Ledgers copy nature, statement and type from their sub group. Opening balances add up to zero.
const LEDGERS: [string, string, string, number][] = [
  ['100028', 'Sewing Machines', '100011', 2500000],
  ['100029', 'Cutting Machines', '100011', 800000],
  ['100030', 'Office Furniture', '100012', 150000],
  ['100031', 'Cash in Hand - Head Office', '100013', 250000],
  ['100032', 'Cash in Hand - Factory', '100013', 75000],
  ['100033', 'Dutch-Bangla Bank - CD A/C', '100014', 1850000],
  ['100034', 'Pubali Bank - CD A/C', '100014', 920000],
  ['100035', 'Buyer - H&M', '100015', 450000],
  ['100036', 'Buyer - Primark', '100015', 230000],
  ['100037', 'Fabric Stock', '100016', 600000],
  ['100038', 'Accessories Stock', '100016', 150000],
  ['100039', 'Order PO-2026-101 (H&M)', '100017', 0],
  ['100040', 'Order PO-2026-102 (Primark)', '100017', 0],
  ['100041', "Proprietor's Capital", '100018', -4205000],
  ['100042', 'Supplier - Fabric Mills Ltd', '100019', -650000],
  ['100043', 'Supplier - Accessories House', '100019', -120000],
  ['100044', 'Pubali Bank - Term Loan', '100020', -3000000],
  ['100045', 'Export Sales - Woven', '100021', 0],
  ['100046', 'Export Sales - Knit', '100021', 0],
  ['100047', 'Bank Interest Received', '100022', 0],
  ['100048', 'Electricity - Factory', '100023', 0],
  ['100049', 'Machine Maintenance', '100023', 0],
  ['100050', 'Production Wages - Sewing', '100024', 0],
  ['100051', 'Fabric Purchase', '100025', 0],
  ['100052', 'Accessories Purchase', '100025', 0],
  ['100053', 'Office Salary', '100026', 0],
  ['100054', 'Office Rent', '100026', 0],
  ['100055', 'Freight & C&F Charges', '100027', 0],
];

async function saveAccount(data: {
  code: string;
  name: string;
  level: number;
  parentCode: string;
  parentLevel: number;
  nature: number;
  statement: number;
  ledgerType: number;
  openingBalance: number;
}) {
  await prisma.account.upsert({ where: { code: data.code }, update: data, create: data });
}

async function main() {
  // Admin user
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: await bcrypt.hash('admin123', 10),
      fullName: 'System Administrator',
      role: 'ADMIN',
    },
  });

  for (const [code, name, nature, statement, ledgerType] of GROUPS) {
    await saveAccount({ code, name, level: 1, parentCode: '', parentLevel: 0, nature, statement, ledgerType, openingBalance: 0 });
  }

  for (const [code, name, parentCode, nature, statement, ledgerType] of SUB_GROUPS) {
    await saveAccount({ code, name, level: 2, parentCode, parentLevel: 1, nature, statement, ledgerType, openingBalance: 0 });
  }

  let jobNo = 0;
  for (const [code, name, parentCode, openingBalance] of LEDGERS) {
    const parent = SUB_GROUPS.find((s) => s[0] === parentCode)!;
    const [, , , nature, statement, ledgerType] = parent;
    await saveAccount({ code, name, level: 3, parentCode, parentLevel: 2, nature, statement, ledgerType, openingBalance });

    // Project ledgers get a job in jprofile, like the Save button does
    if (ledgerType === TYPE.PROJECT) {
      jobNo++;
      await prisma.project.upsert({
        where: { accountCode: code },
        update: { name },
        create: { code: String(jobNo).padStart(5, '0'), name, accountCode: code },
      });
    }
  }

  console.log(
    `Seed complete → ${GROUPS.length} groups, ${SUB_GROUPS.length} sub groups, ${LEDGERS.length} ledgers, ${jobNo} project jobs. Login: admin / admin123`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
