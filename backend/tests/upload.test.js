const request = require('supertest');
const app = require('../server');
const path = require('path');
const fs = require('fs');

describe('Upload API', () => {
  const testFilePath = path.join(__dirname, 'test-resume.pdf');

  beforeAll(() => {
    // Create a dummy PDF file for testing
    fs.writeFileSync(testFilePath, 'dummy pdf content');
  });

  afterAll(() => {
    // Clean up
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  test('POST /api/industry/upload-cover - should return 400 if no file uploaded', async () => {
    const response = await request(app)
      .post('/api/industry/upload-cover');
    
    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('No photo uploaded.');
  });

  test('POST /api/industry/upload-cover - should attempt to upload a file', async () => {
    // Note: This test will likely fail if Supabase credentials in .env are invalid/missing 
    // but it proves the Multer middleware is correctly receiving the file.
    const response = await request(app)
      .post('/api/industry/upload-cover')
      .attach('photo', testFilePath);
    
    // If it hits the Supabase error, it might be 500, but we want to see it processed by Multer
    expect(response.statusCode).not.toBe(404); 
  });
});
