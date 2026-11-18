BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[jprofile] ADD [actnon] INT NOT NULL CONSTRAINT [jprofile_actnon_df] DEFAULT 0,
[defalt] INT NOT NULL CONSTRAINT [jprofile_defalt_df] DEFAULT 0,
[enddate] DATE,
[jadd1] NVARCHAR(255) NOT NULL CONSTRAINT [jprofile_jadd1_df] DEFAULT '',
[jadd2] NVARCHAR(255) NOT NULL CONSTRAINT [jprofile_jadd2_df] DEFAULT '',
[necnm] NVARCHAR(255) NOT NULL CONSTRAINT [jprofile_necnm_df] DEFAULT '',
[op_bal] DECIMAL(18,2) NOT NULL CONSTRAINT [jprofile_op_bal_df] DEFAULT 0,
[petycode] VARCHAR(20) NOT NULL CONSTRAINT [jprofile_petycode_df] DEFAULT '',
[phone] VARCHAR(50) NOT NULL CONSTRAINT [jprofile_phone_df] DEFAULT '',
[remarks] NVARCHAR(500) NOT NULL CONSTRAINT [jprofile_remarks_df] DEFAULT '',
[startdate] DATE,
[valued] DECIMAL(18,2) NOT NULL CONSTRAINT [jprofile_valued_df] DEFAULT 0;

-- CreateTable
CREATE TABLE [dbo].[trction] (
    [id] INT NOT NULL IDENTITY(1,1),
    [vdate] DATE NOT NULL,
    [voucher] VARCHAR(20) NOT NULL,
    [drcode] VARCHAR(20) NOT NULL,
    [crcode] VARCHAR(20) NOT NULL,
    [taka] DECIMAL(18,2) NOT NULL,
    [jcode] VARCHAR(20) NOT NULL CONSTRAINT [trction_jcode_df] DEFAULT '',
    [dremark] NVARCHAR(500) NOT NULL CONSTRAINT [trction_dremark_df] DEFAULT '',
    [cremark] NVARCHAR(500) NOT NULL CONSTRAINT [trction_cremark_df] DEFAULT '',
    [datevno] VARCHAR(40) NOT NULL,
    [projacc] VARCHAR(20) NOT NULL CONSTRAINT [trction_projacc_df] DEFAULT '000000',
    [projaccr] VARCHAR(20) NOT NULL CONSTRAINT [trction_projaccr_df] DEFAULT '000000',
    [vtype] INT NOT NULL,
    [prject] VARCHAR(20) NOT NULL CONSTRAINT [trction_prject_df] DEFAULT '',
    CONSTRAINT [trction_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [trction_voucher_idx] ON [dbo].[trction]([voucher]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [trction_vdate_idx] ON [dbo].[trction]([vdate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [trction_drcode_idx] ON [dbo].[trction]([drcode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [trction_crcode_idx] ON [dbo].[trction]([crcode]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
