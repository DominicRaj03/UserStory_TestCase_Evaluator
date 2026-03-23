module.exports = async (req, res) => {
  try {
    const wrappedApp = require('./app.js');
    return wrappedApp(req, res);
  } catch (err) {
    // We catch the error that triggered the Generic Vercel 500 HTML page!
    res.status(500).json({
      error: 'Vercel Lambda Boot Crash Caught',
      message: err.message,
      stack: err.stack,
      dirname: __dirname,
      cwd: process.cwd(),
      node_version: process.version
    });
  }
};
