const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const apiRoutes = require('./routes/api');
const Admin = require('./models/Admin');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api', apiRoutes);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/quizapp';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    try {
      const count = await Admin.countDocuments();
      if (count === 0) {
        const hashedPassword = await bcrypt.hash('admin@26', 10);
        await Admin.create({ username: 'admin', password: hashedPassword });
        console.log('Default admin created: admin / admin@26');
      }
    } catch (e) {
      console.error('Error creating default admin', e);
    }
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

const path = require('path');

// We'll start the server anyway so the user can test if the app runs
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development') {
  const buildPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

