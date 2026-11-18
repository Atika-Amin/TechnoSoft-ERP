import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Account } from '../../generated/prisma/client.js';
import { LEVEL_NO, LEVEL_OF, NATURE_NO, NATURE_OF, STATEMENT_NO, STATEMENT_OF, TYPE_NO, TYPE_OF } from './accounts.codes.js';
import { AccountsRepository } from './accounts.repository.js';
import type { LedgerType, Level, Nature, SaveAccountDto } from './dto/save-account.dto.js';

// Which level each level must sit under (FoxPro combo1 row source)
const PARENT_LEVEL: Record<Level, Level | null> = {
  GROUP: null,
  SUBGROUP: 'GROUP', // where ledlabel <= 1
  LEDGER: 'SUBGROUP', // where ledlabel == 2
};

const LABEL: Record<Level, string> = { GROUP: 'group', SUBGROUP: 'sub group', LEDGER: 'ledger' };

// What each nature allows (FoxPro optiongroup2, option1-4):
// Assets / Liability are balance-sheet accounts → never in Trading, Manufacturing or P&L
// Income / Expense must be in one of them, and can't be Bank, Store or Party
const NATURE_RULES: Record<Nature, { needsStatement: boolean; blockedTypes: LedgerType[] }> = {
  ASSETS: { needsStatement: false, blockedTypes: [] },
  LIABILITY: { needsStatement: false, blockedTypes: [] },
  INCOME: { needsStatement: true, blockedTypes: ['BANK', 'STORE', 'PARTY'] },
  EXPENSE: { needsStatement: true, blockedTypes: ['BANK', 'STORE', 'PARTY'] },
};

export const padCode = (code: string) => code.trim().padStart(6, '0'); // FoxPro: padl(thiscode, 6, [0])

// Business logic layer: all chart-of-accounts rules live here
@Injectable()
export class AccountsService {
  constructor(private readonly repo: AccountsRepository) {}

  async findAll() {
    const [accounts, projects] = await Promise.all([this.repo.findAll(), this.repo.findAllProjects()]);
    const jobOf = new Map(projects.map((p) => [p.accountCode, p.code]));
    return accounts.map((a) => ({ ...toResponse(a), projectCode: jobOf.get(a.code) ?? null }));
  }

  async create(dto: SaveAccountDto) {
    // Code: the one typed in (like FoxPro's Code box), or the next free one
    let code: string;
    if (dto.code) {
      code = padCode(dto.code);
      const taken = await this.repo.findByCode(code);
      if (taken) throw new ConflictException(`Code ${code} is already used by "${taken.name}"`);
    } else {
      code = await this.repo.nextCode();
    }

    const data = await this.buildData(dto);
    await this.ensureUniqueName(data.name, dto.level);

    const { account, project } = await this.repo.create(
      { ...data, code, level: LEVEL_NO[dto.level] },
      this.needsProject(dto.level, data.ledgerType),
    );
    return { ...toResponse(account), createdProjectCode: project?.code ?? null };
  }

  async update(code: string, dto: SaveAccountDto) {
    const existing = await this.repo.findByCode(code);
    if (!existing) throw new NotFoundException(`Account ${code} not found`);

    // FoxPro: if curnat <> ledno → "Miss Match !"
    if (existing.level !== LEVEL_NO[dto.level]) {
      throw new BadRequestException(
        `Mismatch: ${code} is a ${LABEL[LEVEL_OF[existing.level]]}, not a ${LABEL[dto.level]}`,
      );
    }

    const data = await this.buildData(dto, code);
    await this.ensureUniqueName(data.name, dto.level, code);

    // Ledgers copy their sub group's settings, so changing a sub group updates its ledgers too
    const pushToLedgers =
      dto.level === 'SUBGROUP'
        ? { nature: data.nature, statement: data.statement, ledgerType: data.ledgerType }
        : null;

    const { account, project } = await this.repo.update(
      code,
      data,
      this.needsProject(dto.level, data.ledgerType),
      pushToLedgers,
    );
    return { ...toResponse(account), createdProjectCode: project?.code ?? null };
  }

  // FoxPro: if ledno == 3 .and. tcodesgn == 6 → create a jprofile record
  private needsProject(level: Level, ledgerType: number) {
    return level === 'LEDGER' && ledgerType === TYPE_NO.PROJECT;
  }

  // Checks the parent and works out the exact values to store (as FoxPro numbers)
  private async buildData(dto: SaveAccountDto, ownCode?: string) {
    const parentLevel = PARENT_LEVEL[dto.level];
    let nature = NATURE_NO[dto.nature];
    let statement = dto.statement ? STATEMENT_NO[dto.statement] : 0;
    let ledgerType = TYPE_NO[dto.ledgerType];
    let parentCode = '';
    let parentLevelNo = 0;

    if (parentLevel) {
      if (!dto.parentCode) throw new BadRequestException(`Please select a ${LABEL[parentLevel]}`);
      if (dto.parentCode === ownCode) throw new BadRequestException('An account cannot be its own parent');

      const parent = await this.repo.findByCode(dto.parentCode);
      if (!parent || parent.level !== LEVEL_NO[parentLevel]) {
        throw new BadRequestException(`Parent must be a ${LABEL[parentLevel]}`);
      }
      parentCode = parent.code; // undergrp
      parentLevelNo = parent.level; // underlabel

      // FoxPro option3: on the Ledger tab these options are disabled, so a ledger copies its sub group
      if (dto.level === 'LEDGER') {
        nature = parent.nature;
        statement = parent.statement;
        ledgerType = parent.ledgerType;
      }
    }

    const rule = NATURE_RULES[NATURE_OF[nature]];
    const natureName = NATURE_OF[nature].toLowerCase();
    if (!rule.needsStatement) statement = 0; // Assets / Liability: tmpa is always 0
    if (rule.needsStatement && !statement) {
      throw new BadRequestException(
        `An ${natureName} account must be in Trading, Manufacturing, Profit / Loss or P/L Appropriation`,
      );
    }
    if (rule.blockedTypes.includes(TYPE_OF[ledgerType])) {
      throw new BadRequestException(`An ${natureName} account cannot be of type ${TYPE_OF[ledgerType].toLowerCase()}`);
    }

    const isLedger = dto.level === 'LEDGER';
    return {
      name: dto.name.trim(),
      nature,
      statement,
      parentCode,
      parentLevel: parentLevelNo,
      ledgerType,
      openingBalance: isLedger ? dto.openingBalance : 0, // only ledgers have an opening balance
      remarks1: dto.remarks1?.trim() ?? '',
      remarks2: dto.remarks2?.trim() ?? '',
      entryDate: new Date(), // FoxPro: thisdate = date()
    };
  }

  private async ensureUniqueName(name: string, level: Level, ownCode?: string) {
    const found = await this.repo.findByNameAndLevel(name, LEVEL_NO[level]);
    if (found && found.code !== ownCode) {
      throw new ConflictException(`A ${LABEL[level]} named "${name}" already exists`);
    }
  }
}

// lcodes row (FoxPro numbers) → JSON the React app expects (words)
function toResponse(a: Account) {
  return {
    code: a.code,
    name: a.name,
    level: LEVEL_OF[a.level],
    parentCode: a.parentCode || null,
    nature: NATURE_OF[a.nature],
    statement: STATEMENT_OF[a.statement] ?? null, // 0 → null
    ledgerType: TYPE_OF[a.ledgerType],
    openingBalance: a.openingBalance.toNumber(),
    remarks1: a.remarks1,
    remarks2: a.remarks2,
  };
}
