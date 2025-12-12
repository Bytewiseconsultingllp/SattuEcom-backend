const swaggerJsdoc = require('swagger-jsdoc');
 
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-commerce API Documentation',
      version: '1.0.0',
      description: 'Comprehensive e-commerce backend API with authentication and OTP verification',
      contact: {
        name: 'API Support',
        email: 'support@ecommerce.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Development server',
      },
      {
        url: 'http://localhost:5000',
        description: 'Alternative server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.js'], // Path to the API routes
};
 
const swaggerSpec = swaggerJsdoc(options);
 
module.exports = swaggerSpec;