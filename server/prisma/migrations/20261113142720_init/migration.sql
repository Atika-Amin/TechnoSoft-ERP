/*
  Warnings:

  - You are about to drop the `accounts` table. If the table is not empty, all the data it contains will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[accounts] DROP CONSTRAINT [accounts_parentCode_fkey];

-- DropTable
DROP TABLE [dbo].[accounts];

-- CreateTable
CREATE TABLE [dbo].[lcodes] (
    [ledcode] VARCHAR(20) NOT NULL,
    [ledname] NVARCHAR(255) NOT NULL,
    [lednat] INT NOT NULL,
    [tmpa] INT NOT NULL CONSTRAINT [lcodes_tmpa_df] DEFAULT 0,
    [ledlabel] INT NOT NULL,
    [undergrp] VARCHAR(20) NOT NULL CONSTRAINT [lcodes_undergrp_df] DEFAULT '',
    [underlabel] INT NOT NULL CONSTRAINT [lcodes_underlabel_df] DEFAULT 0,
    [codesign] INT NOT NULL CONSTRAINT [lcodes_codesign_df] DEFAULT 5,
    [op_bal] DECIMAL(18,2) NOT NULL CONSTRAINT [lcodes_op_bal_df] DEFAULT 0,
    [tot_debit] DECIMAL(18,2) NOT NULL CONSTRAINT [lcodes_tot_debit_df] DEFAULT 0,
    [tot_credit] DECIMAL(18,2) NOT NULL CONSTRAINT [lcodes_tot_credit_df] DEFAULT 0,
    [thisbal] DECIMAL(18,2) NOT NULL CONSTRAINT [lcodes_thisbal_df] DEFAULT 0,
    [rem1] NVARCHAR(500) NOT NULL CONSTRAINT [lcodes_rem1_df] DEFAULT '',
    [rem2] NVARCHAR(500) NOT NULL CONSTRAINT [lcodes_rem2_df] DEFAULT '',
    [entdate] DATETIME2 NOT NULL CONSTRAINT [lcodes_entdate_df] DEFAULT CURRENT_TIMESTAMP,
    [printsl] INT NOT NULL CONSTRAINT [lcodes_printsl_df] DEFAULT 0,
    CONSTRAINT [lcodes_pkey] PRIMARY KEY CLUSTERED ([ledcode])
);

-- CreateTable
CREATE TABLE [dbo].[jprofile] (
    [jcode] VARCHAR(20) NOT NULL,
    [jname] NVARCHAR(255) NOT NULL,
    [acccode] VARCHAR(20) NOT NULL,
    CONSTRAINT [jprofile_pkey] PRIMARY KEY CLUSTERED ([jcode]),
    CONSTRAINT [jprofile_acccode_key] UNIQUE NONCLUSTERED ([acccode])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [lcodes_undergrp_idx] ON [dbo].[lcodes]([undergrp]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [lcodes_ledlabel_idx] ON [dbo].[lcodes]([ledlabel]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
