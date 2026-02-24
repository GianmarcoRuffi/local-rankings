import mysql from "mysql2/promise";

async function createDatabaseUser() {
  const rootHost = process.env.DB_ROOT_HOST || "localhost";
  const rootPort = Number(process.env.DB_ROOT_PORT) || 3306;
  const rootUser = process.env.DB_ROOT_USER || "root";
  const rootPassword = process.env.DB_ROOT_PASSWORD || "";

  const dbHost = process.env.DATABASE_HOST || "localhost";
  const dbPort = Number(process.env.DATABASE_PORT) || 3306;
  const dbName = process.env.DATABASE_NAME || "local_rankings";
  const dbUser = process.env.DATABASE_USER || "local_rankings_user";
  const dbPassword = process.env.DATABASE_PASSWORD || "local_rankings_pass";

  console.log("🔧 Creating database user and database...\n");
  console.log(`   Root connection: ${rootUser}@${rootHost}:${rootPort}`);
  console.log(`   Database: ${dbName}`);
  console.log(`   New user: ${dbUser}`);
  console.log(`   Host: ${dbHost}\n`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host: rootHost,
      port: rootPort,
      user: rootUser,
      password: rootPassword,
    });

    console.log("✅ Connected to MySQL server");

    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ Database '${dbName}' created or already exists`);

    const [existingUsers] = await connection.execute(
      `SELECT User FROM mysql.user WHERE User = ? AND Host = ?`,
      [dbUser, dbHost]
    );

    if ((existingUsers as any[]).length > 0) {
      console.log(`ℹ️  User '${dbUser}'@'${dbHost}' already exists`);
      await connection.execute(`SET PASSWORD FOR '${dbUser}'@'${dbHost}' = PASSWORD('${dbPassword}')`);
      console.log(`✅ Password updated for '${dbUser}'@'${dbHost}'`);
    } else {
      await connection.execute(`CREATE USER '${dbUser}'@'${dbHost}' IDENTIFIED BY '${dbPassword}'`);
      console.log(`✅ User '${dbUser}'@'${dbHost}' created`);
    }

    await connection.execute(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'${dbHost}'`);
    await connection.execute(`FLUSH PRIVILEGES`);
    console.log(`✅ Privileges granted on '${dbName}' to '${dbUser}'@'${dbHost}'`);

    console.log("\n🎉 Database setup completed!");
    console.log("\n📋 Connection details for your .env file:");
    console.log("─────────────────────────────────────────");
    console.log(`DATABASE_HOST=${dbHost}`);
    console.log(`DATABASE_PORT=${dbPort}`);
    console.log(`DATABASE_NAME=${dbName}`);
    console.log(`DATABASE_USER=${dbUser}`);
    console.log(`DATABASE_PASSWORD=${dbPassword}`);
    console.log("─────────────────────────────────────────");

    console.log("\n💡 Next steps:");
    console.log("   1. Create a .env file with the credentials above");
    console.log("   2. Run 'npm run db:push' to create tables");
    console.log("   3. Run 'npm run db:mock' to seed test data");

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.code === "ER_ACCESS_DENIED_ERROR") {
      console.log("\n💡 Tip: Make sure your root credentials are correct:");
      console.log("   Set DB_ROOT_USER and DB_ROOT_PASSWORD environment variables");
    }
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

createDatabaseUser();
