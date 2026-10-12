const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
    return res.status(200).send({
        "NODE_ENV": process.env.NODE_ENV,
        "PORT": process.env.PORT,
        "SAP_BASE_URL":process.env.SAP_BASE_URL,
        "SAP_SERVICE_URL":process.env.SAP_SERVICE_URL
    });
});

module.exports = router;