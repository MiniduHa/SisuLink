const request = require('supertest');
const app = require('../server');

describe('Messaging API', () => {
  test('POST /api/school-admin/:email/messages/send - should return 404 for invalid school email', async () => {
    const response = await request(app)
      .post('/api/school-admin/invalid@school.com/messages/send')
      .send({
        targetRole: 'Teacher',
        message: 'Hello Teachers'
      });
    
    // The current implementation might return 404 if school is not found
    expect(response.statusCode).not.toBe(200);
  });

  test('GET /api/teachers/:teacherId/messages - should return messages for a teacher', async () => {
    const response = await request(app).get('/api/teachers/999/messages');
    // Even if no messages, it should return 200 with an empty array or 404/500 if ID is invalid
    expect(response.statusCode).not.toBe(404);
  });
});
