BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[voice_samples] (
    [id] INT NOT NULL IDENTITY(1,1),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [voice_samples_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [speaker_id] VARCHAR(36) NOT NULL,
    [gender] VARCHAR(10) NOT NULL,
    [age_group] VARCHAR(10) NOT NULL,
    [region] NVARCHAR(50) NOT NULL,
    [environment] VARCHAR(10) NOT NULL,
    [device] VARCHAR(10) NOT NULL,
    [mode] VARCHAR(10) NOT NULL,
    [seed] INT NOT NULL,
    [prompt_text] NVARCHAR(500) NOT NULL,
    [transcript] NVARCHAR(500) NOT NULL CONSTRAINT [voice_samples_transcript_df] DEFAULT '',
    [label] NVARCHAR(max) NOT NULL,
    [audio_file] VARCHAR(100) NOT NULL,
    [mime_type] VARCHAR(50) NOT NULL,
    [duration_ms] INT NOT NULL,
    [size_bytes] INT NOT NULL,
    [status] VARCHAR(10) NOT NULL CONSTRAINT [voice_samples_status_df] DEFAULT 'new',
    CONSTRAINT [voice_samples_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [voice_samples_speaker_id_idx] ON [dbo].[voice_samples]([speaker_id]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
