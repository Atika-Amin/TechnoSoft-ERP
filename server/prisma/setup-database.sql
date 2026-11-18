-- Run this ONCE in SQL Server Management Studio (connected as an admin, e.g. sa or Windows login)
-- It creates the database and a login that the NestJS app uses.

CREATE DATABASE technosoft;
GO

CREATE LOGIN technosoft_app WITH PASSWORD = 'ChangeMe123!', CHECK_POLICY = OFF;
-- Prisma's "migrate dev" creates a temporary shadow database, so the login needs this role
ALTER SERVER ROLE dbcreator ADD MEMBER technosoft_app;
GO

USE technosoft;
CREATE USER technosoft_app FOR LOGIN technosoft_app;
ALTER ROLE db_owner ADD MEMBER technosoft_app;
GO
