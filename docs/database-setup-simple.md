# PostgreSQL 数据库设置指南（简化版）

## 快速开始

### 方法 1: 使用 Docker（推荐）

```bash
# 启动 PostgreSQL
docker-compose up -d

# 等待数据库启动（约 5 秒）

# 创建表结构
npm run db:setup
```

### 方法 2: 本地安装 PostgreSQL

#### macOS
```bash
brew install postgresql@16
brew services start postgresql@16
createdb cognition_digest
```

#### Ubuntu/Debian
```bash
sudo apt install postgresql
sudo systemctl start postgresql
sudo -u postgres createdb cognition_digest
```

## 配置

在 `.env` 文件中添加：

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cognition_digest
```

## 创建表结构

```bash
npm run db:setup
```

这会执行 `sql/schema.sql` 脚本，创建以下表：
- `users` - 用户信息（Google OAuth）
- `reports` - 摘要报告

## 验证

```bash
# 连接数据库
psql cognition_digest

# 查看表
\dt

# 查看 reports 表结构
\d reports

# 退出
\q
```

## 常用操作

### 查看所有报告
```sql
SELECT report_id, status, source, created_at FROM reports ORDER BY created_at DESC LIMIT 10;
```

### 查看特定报告
```sql
SELECT * FROM reports WHERE report_id = 'rpt_20251007_abc123';
```

### 清空数据（保留表结构）
```sql
TRUNCATE TABLE reports CASCADE;
TRUNCATE TABLE users CASCADE;
```

### 删除所有表（重新开始）
```sql
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```

然后重新运行 `npm run db:setup`

## 生产环境

推荐使用托管服务：
- [Supabase](https://supabase.com/) - 免费 500MB
- [Neon](https://neon.tech/) - Serverless Postgres
- [Railway](https://railway.app/) - 简单易用

配置生产数据库 URL：
```bash
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

## 故障排查

### 连接失败
```bash
# 检查 PostgreSQL 是否运行
docker ps  # Docker 方式
brew services list  # macOS
sudo systemctl status postgresql  # Linux

# 测试连接
psql -h localhost -U postgres -d cognition_digest
```

### 表已存在错误
SQL 脚本使用 `IF NOT EXISTS`，可以安全地重复运行。

### 权限错误
确保数据库用户有创建表的权限。

## 无数据库模式

如果不想使用数据库，注释掉 `.env` 中的 `DATABASE_URL`：

```bash
# DATABASE_URL=postgresql://...
```

系统会自动使用内存存储（重启后数据丢失）。
