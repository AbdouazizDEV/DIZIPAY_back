-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MERCHANT', 'CLIENT');

-- CreateEnum
CREATE TYPE "MerchantType" AS ENUM ('PHARMACY', 'SCHOOL', 'RETAIL', 'RESTAURANT', 'OTHER');

-- CreateEnum
CREATE TYPE "MerchantStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('WAVE', 'ORANGE_MONEY', 'FREE_MONEY', 'WIZALL', 'EMONEY', 'BANK_ACCOUNT', 'PISPI', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "QRCodeType" AS ENUM ('DYNAMIC', 'STATIC');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MERCHANT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MerchantType" NOT NULL,
    "phone" TEXT NOT NULL,
    "ninea" TEXT,
    "pispiAccountId" TEXT,
    "pispiAlias" TEXT,
    "pispiInstitution" TEXT,
    "status" "MerchantStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "description" TEXT,
    "clientPhone" TEXT,
    "clientName" TEXT,
    "clientAlias" TEXT,
    "pispiPaymentId" TEXT,
    "pispiTransactionRef" TEXT,
    "pispiDebitAccount" TEXT,
    "pispiCreditAccount" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod",
    "qrCodeId" TEXT,
    "metadata" JSONB,
    "initiatedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_codes" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "type" "QRCodeType" NOT NULL,
    "content" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'EMVCo',
    "detectedType" TEXT,
    "parsedData" JSONB,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pispi_logs" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "statusCode" INTEGER,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pispi_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_reconciliations" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "merchantId" TEXT,
    "totalTransactions" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL,
    "successAmount" INTEGER NOT NULL,
    "failedCount" INTEGER NOT NULL,
    "pendingCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OK',
    "gap" INTEGER NOT NULL DEFAULT 0,
    "reconciledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "merchants_userId_key" ON "merchants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "merchants_phone_key" ON "merchants"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "merchants_ninea_key" ON "merchants"("ninea");

-- CreateIndex
CREATE UNIQUE INDEX "merchants_pispiAccountId_key" ON "merchants"("pispiAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "merchants_pispiAlias_key" ON "merchants"("pispiAlias");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_pispiPaymentId_key" ON "transactions"("pispiPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_pispiTransactionRef_key" ON "transactions"("pispiTransactionRef");

-- CreateIndex
CREATE INDEX "transactions_merchantId_idx" ON "transactions"("merchantId");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "qr_codes_content_key" ON "qr_codes"("content");

-- CreateIndex
CREATE INDEX "qr_codes_merchantId_idx" ON "qr_codes"("merchantId");

-- CreateIndex
CREATE INDEX "pispi_logs_transactionId_idx" ON "pispi_logs"("transactionId");

-- CreateIndex
CREATE INDEX "pispi_logs_createdAt_idx" ON "pispi_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "daily_reconciliations_date_merchantId_key" ON "daily_reconciliations"("date", "merchantId");

-- AddForeignKey
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "qr_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

