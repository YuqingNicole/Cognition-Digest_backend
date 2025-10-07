# 数据库和队列设置指南

## 概述

本项目使用以下技术栈实现数据持久化和异步任务处理：

- **PostgreSQL**: 关系型数据库，存储用户和报告数据
- **Prisma**: 现代化的 ORM，提供类型安全的数据库访问
- **Bull**: 基于 Redis 的任务队列，处理异步任务
- **Redis**: 内存数据库，用于队列和缓存

## 快速开始

### 方法 1: 使用 Docker Compose（推荐）

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: cognition-digest-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: cognition_digest
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: cognition-digest-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

启动服务：

```bash
docker-compose up -d
```

### 方法 2: 本地安装

#### macOS (使用 Homebrew)

```bash
# 安装 PostgreSQL
brew install postgresql@16
brew services start postgresql@16

# 安装 Redis
brew install redis
brew services start redis

# 创建数据库
createdb cognition_digest
```

#### Ubuntu/Debian

```bash
# 安装 PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# 安装 Redis
sudo apt install redis-server

# 启动服务
sudo systemctl start postgresql
sudo systemctl start redis

# 创建数据库
sudo -u postgres createdb cognition_digest
```

## 配置环境变量

在 `.env` 文件中配置数据库连接：

```bash
# PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cognition_digest?schema=public

# Redis
REDIS_URL=redis://localhost:6379
```

**生产环境示例**:

```bash
# Heroku Postgres
DATABASE_URL=postgresql://user:pass@host.compute.amazonaws.com:5432/dbname

# Redis Cloud
REDIS_URL=redis://:password@redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com:12345
```

## Prisma 数据库迁移

### 1. 生成 Prisma Client

```bash
npm run db:generate
```

### 2. 推送 Schema 到数据库（开发环境）

```bash
npm run db:push
```

这会直接同步 schema 到数据库，适合快速开发。

### 3. 创建迁移（生产环境）

```bash
npm run db:migrate
```

这会创建迁移文件并应用到数据库，适合版本控制。

### 4. 查看数据库（可选）

```bash
npm run db:studio
```

在浏览器中打开 Prisma Studio（http://localhost:5555）查看和编辑数据。

## 数据模型

### User 表

存储通过 Google OAuth 登录的用户信息：

```prisma
model User {
  id         String   @id @default(uuid())
  email      String   @unique
  name       String?
  picture    String?
  provider   String   // "google"
  providerId String   // Google user ID
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  reports    Report[]
}
```

### Report 表

存储摘要报告数据：

```prisma
model Report {
  id              String    @id @default(uuid())
  reportId        String    @unique // rpt_20251007_xxx
  status          String    // "processing", "completed", "failed"
  source          String    // "youtube", "podcast", "article"
  channelId       String?
  videoId         String?
  url             String?
  format          String    // "summary", "detailed", "bullet_points"
  language        String
  
  // Summary
  summaryTitle    String?
  summaryPoints   String[]  // Array of key points
  wordCount       Int?
  fullText        String?   @db.Text
  
  // Delivery
  deliveryMethod  String    // "email", "webhook", "none"
  deliveryAddress String?   // email or webhook URL
  deliveryStatus  String    // "queued", "sent", "failed", "none"
  
  // Timestamps
  createdAt       DateTime  @default(now())
  completedAt     DateTime?
  updatedAt       DateTime  @updatedAt
  
  // Relations
  userId          String?
  user            User?     @relation(fields: [userId], references: [id])
}
```

## 任务队列

### 队列类型

1. **report-processing**: 处理视频摘要生成
2. **email-delivery**: 发送邮件

### 队列配置

```typescript
// src/services/queueService.ts

export const reportQueue = new Queue("report-processing", REDIS_URL, {
  defaultJobOptions: {
    attempts: 2,              // 最多重试 2 次
    backoff: {
      type: "exponential",    // 指数退避
      delay: 5000,            // 初始延迟 5 秒
    },
    removeOnComplete: 100,    // 保留最近 100 个完成的任务
    removeOnFail: 500,        // 保留最近 500 个失败的任务
  },
});
```

### 任务流程

```
1. 用户创建报告
   ↓
2. 保存到数据库 (status: "processing")
   ↓
3. 添加到 report-processing 队列
   ↓
4. 队列处理器执行任务
   ↓
5. 更新数据库 (status: "completed", 添加摘要)
   ↓
6. 如果 delivery.method === "email"
   ↓
7. 添加到 email-delivery 队列
   ↓
8. 发送邮件
   ↓
9. 更新 delivery_status: "sent"
```

## 监控队列

### Bull Board（可选）

安装 Bull Board 可视化监控：

```bash
npm install @bull-board/api @bull-board/fastify
```

添加到 `src/app.ts`:

```typescript
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import { reportQueue, emailQueue } from './services/queueService.js';

const serverAdapter = new FastifyAdapter();

createBullBoard({
  queues: [
    new BullAdapter(reportQueue),
    new BullAdapter(emailQueue),
  ],
  serverAdapter,
});

serverAdapter.setBasePath('/admin/queues');
app.register(serverAdapter.registerPlugin(), { prefix: '/admin/queues' });
```

访问 `http://localhost:4000/admin/queues` 查看队列状态。

### Redis CLI 监控

```bash
# 连接 Redis
redis-cli

# 查看所有键
KEYS *

# 查看队列长度
LLEN bull:report-processing:wait
LLEN bull:email-delivery:wait

# 查看队列统计
HGETALL bull:report-processing:stats
```

## 数据库备份

### PostgreSQL 备份

```bash
# 备份
pg_dump cognition_digest > backup.sql

# 恢复
psql cognition_digest < backup.sql
```

### 自动备份脚本

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
DB_NAME="cognition_digest"

mkdir -p $BACKUP_DIR
pg_dump $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# 保留最近 7 天的备份
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

## 性能优化

### 1. 数据库索引

已在 schema 中添加索引：

```prisma
@@index([reportId])
@@index([userId])
@@index([status])
@@index([createdAt])
```

### 2. 连接池配置

在 `DATABASE_URL` 中配置：

```bash
DATABASE_URL=postgresql://user:pass@host:5432/db?schema=public&connection_limit=10&pool_timeout=20
```

### 3. Redis 持久化

编辑 `redis.conf`:

```conf
# RDB 持久化（快照）
save 900 1
save 300 10
save 60 10000

# AOF 持久化（日志）
appendonly yes
appendfsync everysec
```

## 故障排查

### PostgreSQL 连接失败

```bash
# 检查服务状态
brew services list  # macOS
sudo systemctl status postgresql  # Linux

# 检查端口占用
lsof -i :5432

# 测试连接
psql -h localhost -U postgres -d cognition_digest
```

### Redis 连接失败

```bash
# 检查服务状态
brew services list  # macOS
sudo systemctl status redis  # Linux

# 测试连接
redis-cli ping
# 应返回: PONG
```

### Prisma 错误

```bash
# 重新生成 client
npm run db:generate

# 重置数据库（警告：会删除所有数据）
npx prisma migrate reset

# 查看迁移状态
npx prisma migrate status
```

### 队列卡住

```bash
# 清空队列
redis-cli
FLUSHDB  # 清空当前数据库
FLUSHALL # 清空所有数据库（谨慎使用）

# 或在代码中
await reportQueue.empty();
await emailQueue.empty();
```

## 生产环境部署

### 推荐的托管服务

**PostgreSQL**:
- [Supabase](https://supabase.com/) - 免费 500MB
- [Neon](https://neon.tech/) - Serverless Postgres
- [Railway](https://railway.app/) - 简单易用
- AWS RDS, Google Cloud SQL, Azure Database

**Redis**:
- [Upstash](https://upstash.com/) - Serverless Redis
- [Redis Cloud](https://redis.com/cloud/) - 官方托管
- [Railway](https://railway.app/)
- AWS ElastiCache, Google Memorystore

### 环境变量

```bash
# 生产环境 .env
NODE_ENV=production
DATABASE_URL=postgresql://...  # 生产数据库
REDIS_URL=redis://...          # 生产 Redis
```

### 迁移部署

```bash
# 1. 构建项目
npm run build

# 2. 运行迁移
npm run db:migrate

# 3. 启动服务
npm start
```

## 相关文档

- [Prisma 文档](https://www.prisma.io/docs)
- [Bull 文档](https://github.com/OptimalBits/bull)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)
- [Redis 文档](https://redis.io/docs/)
