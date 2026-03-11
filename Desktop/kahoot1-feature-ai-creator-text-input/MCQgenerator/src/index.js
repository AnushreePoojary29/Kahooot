require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');

const uploadRoutes = require('./routes/upload');
const mcqRoutes = require('./routes/mcq');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use('/upload', uploadRoutes);
app.use('/generate-mcq', mcqRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
