# MySQL Migration Guide

This application has been converted from PostgreSQL to MySQL for consistency with your local development environment.

## ✅ What's Been Done

1. **✓ Installed MySQL driver** (`mysql2` package)
2. **✓ Converted database schema** from PostgreSQL to MySQL syntax
   - Changed from `pgTable` to `mysqlTable`
   - Converted `jsonb` to `json`
   - Updated UUID handling for MySQL
   - Converted array types to JSON arrays
3. **✓ Updated database connection** (`server/db.ts`) to use MySQL
4. **✓ Removed PostgreSQL dependencies** (`@neondatabase/serverless`)

## 📋 What You Need to Do

### Step 1: Update `drizzle.config.ts`

**Manually edit** the `drizzle.config.ts` file and change the dialect from `postgresql` to `mysql`:

```typescript
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Please provide your MySQL connection string.");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",  // ← Change this from "postgresql" to "mysql"
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
```

### Step 2: Set MySQL Connection String

You need to provide your MySQL database connection URL. The format is:

```
mysql://username:password@host:port/database_name
```

**Example:**
```
mysql://root:mypassword@localhost:3306/lending_app
```

**For Replit Secrets:**
1. Click the **Secrets** tab (lock icon in sidebar)
2. Create a new secret named `DATABASE_URL`
3. Set the value to your MySQL connection string

**For Local Development:**
Create a `.env` file in the root directory:
```env
DATABASE_URL=mysql://root:yourpassword@localhost:3306/lending_app
```

### Step 3: Create MySQL Database

Make sure your MySQL database exists. Connect to MySQL and run:

```sql
CREATE DATABASE lending_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 4: Push Schema to MySQL

Once you've set up the `DATABASE_URL`, push the schema to your MySQL database:

```bash
npm run db:push
```

Or if you encounter issues:

```bash
npm run db:push --force
```

This will create all the tables in your MySQL database.

### Step 5: Restart the Application

After setting up the database, restart the application to connect to MySQL.

## 🔄 Schema Changes Summary

### Key MySQL Conversions:

1. **UUIDs**: Changed from PostgreSQL's `gen_random_uuid()` to MySQL's `UUID()`
   ```typescript
   // PostgreSQL
   id: varchar("id").primaryKey().default(sql`gen_random_uuid()`)
   
   // MySQL
   id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`)
   ```

2. **JSON Arrays**: Array types converted to JSON
   ```typescript
   // PostgreSQL
   documentUrls: text("document_urls").array().default([])
   
   // MySQL
   documentUrls: json("document_urls").$type<string[]>().default([])
   ```

3. **JSONB → JSON**: All JSONB fields converted to JSON
   ```typescript
   // PostgreSQL
   metadata: jsonb("metadata")
   
   // MySQL
   metadata: json("metadata")
   ```

## 📊 Tables in Your Schema

The following tables will be created in MySQL:

- `sessions` - Session storage for Replit Auth
- `users` - User accounts
- `borrowers` - Borrower information
- `loans` - Loan records
- `payments` - Payment transactions
- `reminders` - Email reminders
- `email_logs` - Email activity logs
- `email_templates` - Customizable email templates
- `interest_entries` - Automatic monthly interest tracking
- `audit_logs` - Security and audit trail

## 🔍 Verify Connection

After completing the steps above, check the server logs to verify successful MySQL connection:

```
✓ Connected to MySQL database
```

## 🚨 Troubleshooting

### Error: "Client does not support authentication protocol"
If you get this error with MySQL 8.0+, you need to change the authentication method:

```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
```

### Error: "Access denied for user"
- Verify your username and password in the connection string
- Make sure the MySQL user has proper permissions:
  ```sql
  GRANT ALL PRIVILEGES ON lending_app.* TO 'username'@'localhost';
  FLUSH PRIVILEGES;
  ```

### Connection Timeout
- Check if MySQL is running: `sudo service mysql status`
- Verify the host and port in your connection string
- Make sure your firewall allows MySQL connections

## 📝 Notes

- All existing data in PostgreSQL will **NOT** be migrated automatically
- You'll need to manually export/import data if you need to preserve it
- MySQL uses slightly different data types but all functionality remains the same
- The application logic remains unchanged - only the database layer was updated

## ✨ Benefits of MySQL

- ✅ Consistency with your local development environment
- ✅ Industry-standard relational database
- ✅ Excellent performance for financial applications
- ✅ Wide hosting support
- ✅ Familiar tooling and ecosystem

---

**Next Steps:** Once you complete the manual steps above, your application will be fully running on MySQL! 🎉
