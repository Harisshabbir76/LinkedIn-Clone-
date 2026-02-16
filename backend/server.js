// server.js
const express = require("express");
const connectDB = require("./db");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/profile", require("./routes/profile"));

// FIX: Mount jobs routes correctly
const jobRoutes = require("./routes/jobs");
console.log("Mounting job routes at /api/jobs");
app.use("/api/jobs", jobRoutes);


//admin routes
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Add contact routes
const contactRoutes = require('./routes/ContactUs');
app.use('/api/contact-us', contactRoutes);

// Add notification routes
const notificationRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationRoutes);

// Search route
const searchRoutes = require('./routes/search');
app.use('/api/search', searchRoutes);

//company route
const companyRoutes = require("./routes/company");
app.use("/api/company", companyRoutes);

//application route
const applicationRoutes = require('./routes/applications');
app.use('/api/applications', applicationRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    message: "Server is running",
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get("/api/test", (req, res) => {
  res.status(200).json({ 
    message: "API is working",
    data: { test: "success" }
  });
});

// Test jobs endpoint directly
app.get("/api/jobs/test", (req, res) => {
  res.status(200).json({ 
    message: "Jobs endpoint is working!",
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message,
    path: req.path
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.url} not found`
  });
});

// Connect to DB then start server and initialize Socket.IO
const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => {
    const http = require('http');

    const maxRetries = 3;
    const tryListen = (port, remainingAttempts) => {
      return new Promise((resolve, reject) => {
        const serverInstance = http.createServer(app);

        const onError = (err) => {
          serverInstance.removeAllListeners();
          if (err && err.code === 'EADDRINUSE') {
            console.warn(`Port ${port} is in use.`);
            if (remainingAttempts > 0) {
              const nextPort = parseInt(port, 10) + 1;
              console.log(`Retrying on port ${nextPort} (${remainingAttempts - 1} attempts left)...`);
              // small delay before retry
              setTimeout(() => {
                tryListen(nextPort, remainingAttempts - 1).then(resolve).catch(reject);
              }, 300);
              return;
            }
            return reject(new Error(`Port ${port} is already in use and no retries left.`));
          }
          return reject(err);
        };

        serverInstance.once('error', onError);

        serverInstance.listen(port, () => {
          serverInstance.removeListener('error', onError);
          console.log(`Server listening on port ${port}`);
          console.log(`Health check: http://localhost:${port}/health`);
          console.log(`API test: http://localhost:${port}/api/test`);
          console.log(`Jobs test: http://localhost:${port}/api/jobs/test`);
          console.log(`Profile routes: http://localhost:${port}/api/profile`);
          return resolve(serverInstance);
        });
      });
    };

    tryListen(PORT, maxRetries)
      .then((serverInstance) => {
        // Initialize Socket.IO if available; don't crash if it's missing
        try {
          const { init } = require('./socket');
          try {
            const io = init(serverInstance);
            console.log('Socket.IO initialized');
          } catch (ioErr) {
            console.error('Socket.IO initialization error:', ioErr && ioErr.message ? ioErr.message : ioErr);
          }
        } catch (requireErr) {
          // Missing socket module or socket.io dependency; log and continue
          console.warn('Socket module not available, skipping Socket.IO initialization:', requireErr && requireErr.message ? requireErr.message : requireErr);
        }
      })
      .catch((err) => {
        console.error('Failed to bind server:', err && err.message ? err.message : err);
        process.exit(1);
      });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB. Server not started.');
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  });