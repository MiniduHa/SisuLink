const request = require('supertest');
const app = require('../server');

describe('Authentication API', () => {
  test('POST /api/auth/login - should return 400 for missing credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: '', password: '' });
    
    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('POST /api/auth/login - should return 400 for invalid role', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password', role: 'InvalidRole' });
    
    expect(response.statusCode).toBe(400);
  });

  test('GET /api/schools/list - should return a list of schools', async () => {
    const response = await request(app).get('/api/schools/list');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
