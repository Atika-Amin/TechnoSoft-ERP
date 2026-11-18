BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[users] (
    [id] INT NOT NULL IDENTITY(1,1),
    [username] VARCHAR(50) NOT NULL,
    [passwordHash] VARCHAR(100) NOT NULL,
    [fullName] NVARCHAR(100) NOT NULL,
    [role] VARCHAR(20) NOT NULL CONSTRAINT [users_role_df] DEFAULT 'USER',
    [isActive] BIT NOT NULL CONSTRAINT [users_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [users_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [users_username_key] UNIQUE NONCLUSTERED ([username])
);

-- CreateTable
CREATE TABLE [dbo].[accounts] (
    [code] VARCHAR(10) NOT NULL,
    [name] NVARCHAR(150) NOT NULL,
    [level] VARCHAR(10) NOT NULL,
    [parentCode] VARCHAR(10),
    [nature] VARCHAR(10) NOT NULL,
    [inTrading] BIT NOT NULL CONSTRAINT [accounts_inTrading_df] DEFAULT 0,
    [inManufacturing] BIT NOT NULL CONSTRAINT [accounts_inManufacturing_df] DEFAULT 0,
    [inProfitLoss] BIT NOT NULL CONSTRAINT [accounts_inProfitLoss_df] DEFAULT 0,
    [inAppropriation] BIT NOT NULL CONSTRAINT [accounts_inAppropriation_df] DEFAULT 0,
    [ledgerType] VARCHAR(10),
    [openingBalance] DECIMAL(18,2) NOT NULL CONSTRAINT [accounts_openingBalance_df] DEFAULT 0,
    [remarks1] NVARCHAR(200) NOT NULL CONSTRAINT [accounts_remarks1_df] DEFAULT '',
    [remarks2] NVARCHAR(200) NOT NULL CONSTRAINT [accounts_remarks2_df] DEFAULT '',
    [printOrder] INT NOT NULL CONSTRAINT [accounts_printOrder_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [accounts_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [accounts_pkey] PRIMARY KEY CLUSTERED ([code])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [accounts_parentCode_idx] ON [dbo].[accounts]([parentCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [accounts_level_idx] ON [dbo].[accounts]([level]);

-- AddForeignKey
ALTER TABLE [dbo].[accounts] ADD CONSTRAINT [accounts_parentCode_fkey] FOREIGN KEY ([parentCode]) REFERENCES [dbo].[accounts]([code]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
