const mongoose = require('mongoose');

// Simple health controller to check basic app and DB status
const getHealth = async (req, res) => {
  try {
    const uptimeSeconds = process.uptime();
    const nodeEnv = process.env.NODE_ENV || 'development';

    // Mongoose connection readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const dbState = mongoose.connection.readyState;
    const dbStateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    const dbInfo = {
      state: dbStateMap[dbState] || 'unknown',
    };

    if (dbState === 1 && mongoose.connection.host) {
      dbInfo.host = mongoose.connection.host;
      dbInfo.name = mongoose.connection.name;
    }

    res.status(200).json({
      success: true,
      status: 'ok',
      uptime: Math.floor(uptimeSeconds),
      env: nodeEnv,
      timestamp: new Date().toISOString(),
      db: dbInfo,
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      message: error.message || 'Health check failed',
    });
  }
};

module.exports = {
  getHealth,
};
