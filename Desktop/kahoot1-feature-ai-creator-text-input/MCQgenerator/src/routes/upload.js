const express = require('express');
const multer = require('multer');
const upload = multer();
const { uploadHandler } = require('../controllers/uploadController');

const router = express.Router();

// Accept JSON text or multipart/form-data with file
router.post('/', upload.single('file'), uploadHandler);

module.exports = router;
