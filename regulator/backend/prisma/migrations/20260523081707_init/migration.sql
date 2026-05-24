-- CreateTable
CREATE TABLE "creators" (
    "id" SERIAL NOT NULL,
    "address" VARCHAR(42) NOT NULL,
    "did" VARCHAR(200),
    "didHash" VARCHAR(66),
    "didCid" VARCHAR(100),
    "vcCid" VARCHAR(100),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "original_works" (
    "id" SERIAL NOT NULL,
    "tokenId" BIGINT NOT NULL,
    "contractAddress" VARCHAR(42) NOT NULL,
    "creatorAddress" VARCHAR(42) NOT NULL,
    "nfcChipUID" VARCHAR(200),
    "metadataCid" VARCHAR(100) NOT NULL,
    "artworkCid" VARCHAR(100) NOT NULL,
    "txHash" VARCHAR(66) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'MINTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "original_works_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "derivatives" (
    "id" SERIAL NOT NULL,
    "tokenId" BIGINT NOT NULL,
    "contractAddress" VARCHAR(42) NOT NULL,
    "originalTokenId" BIGINT NOT NULL,
    "creatorAddress" VARCHAR(42) NOT NULL,
    "derivativeType" VARCHAR(50),
    "metadataCid" VARCHAR(100),
    "artworkCid" VARCHAR(100),
    "nfcChipUID" VARCHAR(200),
    "txHash" VARCHAR(66) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'MINTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "derivatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" SERIAL NOT NULL,
    "originalTokenId" BIGINT NOT NULL,
    "creatorAddress" VARCHAR(42) NOT NULL,
    "ruleHash" VARCHAR(66) NOT NULL,
    "configJson" JSONB NOT NULL,
    "txHash" VARCHAR(66) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "operator" VARCHAR(42) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "target" VARCHAR(200),
    "txHash" VARCHAR(66),
    "detailJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "creators_address_key" ON "creators"("address");

-- CreateIndex
CREATE UNIQUE INDEX "creators_did_key" ON "creators"("did");

-- CreateIndex
CREATE INDEX "creators_address_idx" ON "creators"("address");

-- CreateIndex
CREATE INDEX "creators_did_idx" ON "creators"("did");

-- CreateIndex
CREATE UNIQUE INDEX "original_works_tokenId_key" ON "original_works"("tokenId");

-- CreateIndex
CREATE INDEX "original_works_creatorAddress_idx" ON "original_works"("creatorAddress");

-- CreateIndex
CREATE INDEX "original_works_tokenId_contractAddress_idx" ON "original_works"("tokenId", "contractAddress");

-- CreateIndex
CREATE INDEX "original_works_nfcChipUID_idx" ON "original_works"("nfcChipUID");

-- CreateIndex
CREATE INDEX "derivatives_creatorAddress_idx" ON "derivatives"("creatorAddress");

-- CreateIndex
CREATE INDEX "derivatives_originalTokenId_idx" ON "derivatives"("originalTokenId");

-- CreateIndex
CREATE INDEX "derivatives_tokenId_contractAddress_idx" ON "derivatives"("tokenId", "contractAddress");

-- CreateIndex
CREATE INDEX "policies_originalTokenId_idx" ON "policies"("originalTokenId");

-- CreateIndex
CREATE INDEX "policies_creatorAddress_idx" ON "policies"("creatorAddress");

-- CreateIndex
CREATE INDEX "audit_logs_operator_idx" ON "audit_logs"("operator");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "original_works" ADD CONSTRAINT "original_works_creatorAddress_fkey" FOREIGN KEY ("creatorAddress") REFERENCES "creators"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "derivatives" ADD CONSTRAINT "derivatives_creatorAddress_fkey" FOREIGN KEY ("creatorAddress") REFERENCES "creators"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "derivatives" ADD CONSTRAINT "derivatives_originalTokenId_fkey" FOREIGN KEY ("originalTokenId") REFERENCES "original_works"("tokenId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_creatorAddress_fkey" FOREIGN KEY ("creatorAddress") REFERENCES "creators"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_originalTokenId_fkey" FOREIGN KEY ("originalTokenId") REFERENCES "original_works"("tokenId") ON DELETE RESTRICT ON UPDATE CASCADE;
