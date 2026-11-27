BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[profile] (
    [id] INT NOT NULL IDENTITY(1,1),
    [c_name] NVARCHAR(255) NOT NULL CONSTRAINT [profile_c_name_df] DEFAULT '',
    [add1] NVARCHAR(255) NOT NULL CONSTRAINT [profile_add1_df] DEFAULT '',
    [add2] NVARCHAR(255) NOT NULL CONSTRAINT [profile_add2_df] DEFAULT '',
    [add3] NVARCHAR(255) NOT NULL CONSTRAINT [profile_add3_df] DEFAULT '',
    [add4] NVARCHAR(255) NOT NULL CONSTRAINT [profile_add4_df] DEFAULT '',
    [add5] NVARCHAR(255) NOT NULL CONSTRAINT [profile_add5_df] DEFAULT '',
    [nature] NVARCHAR(255) NOT NULL CONSTRAINT [profile_nature_df] DEFAULT '',
    [f_date] DATE,
    [file] NVARCHAR(255) NOT NULL CONSTRAINT [profile_file_df] DEFAULT '',
    [phone] VARCHAR(100) NOT NULL CONSTRAINT [profile_phone_df] DEFAULT '',
    [picture] NVARCHAR(255) NOT NULL CONSTRAINT [profile_picture_df] DEFAULT '',
    [cf_date] DATE,
    [cl_date] DATE,
    CONSTRAINT [profile_pkey] PRIMARY KEY CLUSTERED ([id])
);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
