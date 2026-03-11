const express = require('express');
const { generateHandler, cacheHandler } = require('../controllers/mcqController');

const router = express.Router();

router.post('/', generateHandler);
router.get('/', cacheHandler);

module.exports = router;
