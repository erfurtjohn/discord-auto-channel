-- CreateTable
CREATE TABLE "AutoChannel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "channelId" TEXT NOT NULL,
    "CreatedByGuildMember" TEXT NOT NULL,
    "currentUsers" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "AutoChannel_channelId_key" ON "AutoChannel"("channelId");

-- CreateTable
CREATE TABLE "AutoChannelConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerChannelId" TEXT NOT NULL,
    "parentChannelId" TEXT,
    "nameConvention" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "AutoChannelConfig_triggerChannelId_key" ON "AutoChannelConfig"("triggerChannelId");

-- CreateIndex
CREATE UNIQUE INDEX "AutoChannelConfig_guildId_name_key" ON "AutoChannelConfig"("guildId", "name");
