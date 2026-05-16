const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
// Other routes will be imported here

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
const goalsRoutes = require('./routes/goals');
app.use('/api/goals', goalsRoutes);
const cyclesRoutes = require('./routes/cycles');
app.use('/api/cycles', cyclesRoutes);
const checkinsRoutes = require('./routes/checkins');
app.use('/api/checkins', checkinsRoutes);
const reportsRoutes = require('./routes/reports');
app.use('/api/reports', reportsRoutes);
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);
const devRoutes = require('./routes/dev');
app.use('/api/dev', devRoutes);
const analyticsRoutes = require('./routes/analytics');
app.use('/api/analytics', analyticsRoutes);
const employeeRoutes = require('./routes/employee');
app.use('/api/employee', employeeRoutes);

// Init cron jobs
require('./jobs/cron');


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
