const serverless = require('serverless-http');
const handler = require('../../serverless');

exports.handler = serverless(handler);
