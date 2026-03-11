require('dotenv').config();
const path = require('path');

const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { PrismaClient } = require('@prisma/client');

const dbFileUrl = `file:${path.join(__dirname, 'users.db').replace(/\\/g, '/')}`;

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || dbFileUrl
});

const prisma = new PrismaClient({ adapter });

module.exports = {
  prisma
};
