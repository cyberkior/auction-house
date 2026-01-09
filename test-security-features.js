#!/usr/bin/env node

/**
 * Test script for security and functionality improvements
 * Tests: Rate limiting, validation, DELETE endpoints, error handling
 */

const BASE_URL = 'http://localhost:3100';

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, message = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (message) console.log(`   ${message}`);
  results.tests.push({ name, passed, message });
  if (passed) results.passed++;
  else results.failed++;
}

// Helper to make requests
async function makeRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    const data = await response.json().catch(() => null);
    return { response, data, status: response.status };
  } catch (error) {
    return { error: error.message, status: 0 };
  }
}

// Test 1: Rate Limiting - Strict tier (auth endpoint)
async function testRateLimitingStrict() {
  console.log('\n🧪 Testing Rate Limiting (Strict - Auth)...');

  const requests = [];
  for (let i = 0; i < 7; i++) {
    requests.push(makeRequest('/api/auth', {
      method: 'POST',
      body: JSON.stringify({
        walletAddress: 'TestWallet123',
        signature: 'test',
        message: 'test'
      })
    }));
  }

  const responses = await Promise.all(requests);
  const rateLimited = responses.filter(r => r.status === 429);

  logTest(
    'Rate limiting enforced on auth endpoint',
    rateLimited.length > 0,
    `${rateLimited.length} requests rate limited out of 7`
  );

  // Check for Retry-After header
  const hasRetryAfter = rateLimited.some(r =>
    r.response?.headers?.has('Retry-After')
  );
  logTest(
    'Retry-After header present on 429 response',
    hasRetryAfter,
    'Rate limit response includes retry timing'
  );
}

// Test 2: Input Validation - Invalid wallet address
async function testValidationInvalidWallet() {
  console.log('\n🧪 Testing Input Validation...');

  const { data, status } = await makeRequest('/api/auth', {
    method: 'POST',
    body: JSON.stringify({
      walletAddress: 'invalid-wallet',
      signature: 'test',
      message: 'test'
    })
  });

  logTest(
    'Rejects invalid wallet address',
    status === 400,
    `Status: ${status}, Error: ${data?.error}`
  );

  logTest(
    'Returns structured validation error',
    data?.code === 'VALIDATION_ERROR' && Array.isArray(data?.details),
    `Error code: ${data?.code}, Has details: ${Array.isArray(data?.details)}`
  );
}

// Test 3: Input Validation - Missing required fields
async function testValidationMissingFields() {
  const { data, status } = await makeRequest('/api/auctions', {
    method: 'POST',
    body: JSON.stringify({
      walletAddress: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d'
    })
  });

  logTest(
    'Rejects missing required fields',
    status === 400,
    `Status: ${status}, Error: ${data?.error}`
  );

  logTest(
    'Validation error contains field information',
    data?.details && data.details.length > 0,
    `Field errors: ${data?.details?.map(d => d.field).join(', ')}`
  );
}

// Test 4: DELETE endpoint - Auction (without actual auction)
async function testDeleteAuctionEndpoint() {
  console.log('\n🧪 Testing DELETE Endpoints...');

  const fakeAuctionId = '00000000-0000-0000-0000-000000000000';
  const { data, status } = await makeRequest(`/api/auctions/${fakeAuctionId}`, {
    method: 'DELETE',
    body: JSON.stringify({
      walletAddress: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d'
    })
  });

  logTest(
    'DELETE /api/auctions/[id] endpoint exists',
    status === 404 || status === 403 || status === 400,
    `Status: ${status} (404/403/400 expected for non-existent auction)`
  );

  logTest(
    'Returns structured error for not found',
    data?.code === 'NOT_FOUND' || data?.code === 'VALIDATION_ERROR',
    `Error code: ${data?.code}`
  );
}

// Test 5: DELETE endpoint - Bid
async function testDeleteBidEndpoint() {
  const fakeBidId = '00000000-0000-0000-0000-000000000000';
  const { data, status } = await makeRequest(`/api/bids/${fakeBidId}`, {
    method: 'DELETE',
    body: JSON.stringify({
      walletAddress: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d'
    })
  });

  logTest(
    'DELETE /api/bids/[id] endpoint exists',
    status === 404 || status === 403 || status === 400,
    `Status: ${status} (404/403/400 expected for non-existent bid)`
  );

  logTest(
    'Returns NOT_FOUND error code',
    data?.code === 'NOT_FOUND',
    `Error code: ${data?.code}`
  );
}

// Test 6: Error Handling Consistency
async function testErrorHandlingConsistency() {
  console.log('\n🧪 Testing Error Handling...');

  // Test different error types
  const tests = [
    { endpoint: '/api/notifications?wallet=invalid', expectedStatus: 400 },
    { endpoint: '/api/users/nonexistent', expectedStatus: 404 },
  ];

  for (const test of tests) {
    const { data, status } = await makeRequest(test.endpoint);
    logTest(
      `${test.endpoint} returns ${test.expectedStatus}`,
      status === test.expectedStatus,
      `Expected: ${test.expectedStatus}, Got: ${status}`
    );

    logTest(
      `Error response has consistent structure`,
      data?.error && data?.code,
      `Has error: ${!!data?.error}, Has code: ${!!data?.code}`
    );
  }
}

// Test 7: Rate Limiting - Moderate tier
async function testRateLimitingModerate() {
  console.log('\n🧪 Testing Rate Limiting (Moderate)...');

  // Make 32 requests to exceed moderate limit (30/min)
  const requests = [];
  for (let i = 0; i < 32; i++) {
    requests.push(makeRequest('/api/reports', {
      method: 'POST',
      body: JSON.stringify({
        walletAddress: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',
        auctionId: '00000000-0000-0000-0000-000000000000',
        category: 'scam',
        description: 'Test'
      })
    }));
  }

  const responses = await Promise.all(requests);
  const rateLimited = responses.filter(r => r.status === 429);

  logTest(
    'Moderate rate limiting enforced',
    rateLimited.length > 0,
    `${rateLimited.length} requests rate limited out of 32`
  );
}

// Test 8: Validation - Auction creation with invalid data
async function testAuctionValidation() {
  console.log('\n🧪 Testing Auction Validation...');

  const invalidAuction = {
    walletAddress: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',
    title: 'ab', // Too short
    description: 'Test auction description that is long enough',
    imageUrl: 'https://example.com/image.jpg',
    reservePrice: 1000000000,
    minBidIncrement: 100000000,
    startTime: new Date(Date.now() - 1000).toISOString(), // Past time
    endTime: new Date(Date.now() + 3600000).toISOString()
  };

  const { data, status } = await makeRequest('/api/auctions', {
    method: 'POST',
    body: JSON.stringify(invalidAuction)
  });

  logTest(
    'Rejects auction with title too short',
    status === 400,
    `Status: ${status}`
  );

  const titleError = data?.details?.find(d => d.field === 'title');
  logTest(
    'Validation error specifies title field',
    !!titleError,
    `Title error: ${titleError?.message}`
  );

  // Test past start time
  const { data: data2, status: status2 } = await makeRequest('/api/auctions', {
    method: 'POST',
    body: JSON.stringify({
      ...invalidAuction,
      title: 'Valid Title',
      startTime: new Date(Date.now() - 1000).toISOString()
    })
  });

  logTest(
    'Rejects auction with past start time',
    status2 === 400,
    `Status: ${status2}`
  );

  const timeError = data2?.details?.find(d => d.field === 'startTime');
  logTest(
    'Validation error specifies startTime field',
    !!timeError,
    `Start time error: ${timeError?.message}`
  );
}

// Test 9: Report validation - invalid category
async function testReportValidation() {
  console.log('\n🧪 Testing Report Validation...');

  const { data, status } = await makeRequest('/api/reports', {
    method: 'POST',
    body: JSON.stringify({
      walletAddress: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',
      auctionId: '00000000-0000-0000-0000-000000000000',
      category: 'invalid-category',
      description: 'Test'
    })
  });

  logTest(
    'Rejects report with invalid category',
    status === 400,
    `Status: ${status}, Error: ${data?.error}`
  );

  const categoryError = data?.details?.find(d => d.field === 'category');
  logTest(
    'Validation error specifies category field',
    !!categoryError,
    `Category error: ${categoryError?.message}`
  );
}

// Test 10: GET endpoints still work with rate limiting
async function testGetEndpointsWork() {
  console.log('\n🧪 Testing GET Endpoints (with rate limiting)...');

  const endpoints = [
    '/api/tags',
    '/api/auctions',
  ];

  for (const endpoint of endpoints) {
    const { status } = await makeRequest(endpoint);
    logTest(
      `${endpoint} responds successfully`,
      status === 200,
      `Status: ${status}`
    );
  }
}

// Run all tests
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Security & Functionality Test Suite                  ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    await testRateLimitingStrict();
    await testValidationInvalidWallet();
    await testValidationMissingFields();
    await testDeleteAuctionEndpoint();
    await testDeleteBidEndpoint();
    await testErrorHandlingConsistency();
    await testRateLimitingModerate();
    await testAuctionValidation();
    await testReportValidation();
    await testGetEndpointsWork();

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  Test Results Summary                                  ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📊 Total:  ${results.tests.length}`);
    console.log(`📈 Success Rate: ${((results.passed / results.tests.length) * 100).toFixed(1)}%`);

    if (results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      results.tests.filter(t => !t.passed).forEach(t => {
        console.log(`   - ${t.name}`);
        if (t.message) console.log(`     ${t.message}`);
      });
    }

    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
    process.exit(1);
  }
}

// Wait for server to be ready, then run tests
setTimeout(() => {
  runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}, 2000);
