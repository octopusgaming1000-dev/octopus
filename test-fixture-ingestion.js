/**
 * Test script for fixture ingestion system
 */

const { fixtureIngestionManager } = require('./lib/fixture-ingestion');

async function testFixtureIngestion() {
  console.log('🧪 Testing Fixture Ingestion System...');
  
  try {
    // Test 1: Get providers
    console.log('\n📋 Testing providers...');
    const providers = fixtureIngestionManager.getProviders();
    console.log('Available providers:', providers.map(p => ({ name: p.name, configured: p.isConfigured() })));
    
    // Test 2: Fetch fixtures for today
    console.log('\n📅 Testing fixture fetch for today...');
    const today = new Date();
    const fixtures = await fixtureIngestionManager.fetchFixturesForDate(today);
    console.log(`Fetched ${fixtures.length} fixtures for today:`, fixtures);
    
    // Test 3: Sync to database
    console.log('\n💾 Testing database sync...');
    const result = await fixtureIngestionManager.syncFixturesToDatabase(today);
    console.log('Sync result:', result);
    
    // Test 4: Cache stats
    console.log('\n💾 Testing cache...');
    const cacheStats = fixtureIngestionManager.getCacheStats();
    console.log('Cache stats:', cacheStats);
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests
testFixtureIngestion();
