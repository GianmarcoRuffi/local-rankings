import 'dotenv/config';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL is not set in environment');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function verify() {
  console.log('🔍 Verifying Aiven database content...\n');
  console.log('Connection string:', connectionString.replace(/:[^:@]+@/, ':***@'));
  console.log('');

  try {
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`👤 Users: ${usersResult.rows[0].count}`);
    
    const usersData = await pool.query('SELECT username, display_name FROM users LIMIT 5');
    usersData.rows.forEach(u => console.log(`   - ${u.username} (${u.display_name})`));
    
    const rankingsResult = await pool.query('SELECT COUNT(*) as count FROM rankings');
    console.log(`\n🏆 Rankings: ${rankingsResult.rows[0].count}`);
    
    const rankingsData = await pool.query('SELECT name, is_default FROM rankings LIMIT 5');
    rankingsData.rows.forEach(r => console.log(`   - ${r.name} ${r.is_default ? '(default)' : ''}`));
    
    const stagesResult = await pool.query('SELECT COUNT(*) as count FROM stages');
    console.log(`\n📅 Stages: ${stagesResult.rows[0].count}`);
    
    const stagesData = await pool.query('SELECT name, date, status FROM stages LIMIT 5');
    stagesData.rows.forEach(s => console.log(`   - ${s.name} (${s.date}) [${s.status}]`));
    
    const stageRankingResult = await pool.query('SELECT COUNT(*) as count FROM stage_ranking');
    console.log(`\n📋 Stage Ranking Entries: ${stageRankingResult.rows[0].count}`);
    
    const generalRankingResult = await pool.query('SELECT COUNT(*) as count FROM general_ranking');
    console.log(`📊 General Ranking Entries: ${generalRankingResult.rows[0].count}`);
    
    console.log('\n✅ Database verification completed!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

verify();
