const express = require('express');
const router = express.Router();
const httpProxy = require('http-proxy');

let proxyOptions = {
    changeOrigin: true
};

const apiProxy = httpProxy.createProxyServer(proxyOptions);

router.get('/{*any}', async (req, res) => {
    apiProxy.web(req, res, {target:  process.env.SAP_BASE_URL + process.env.SAP_SERVICE_URL });
});

router.post('/{*any}', async (req, res) => {
    apiProxy.web(req, res, {target:  process.env.SAP_BASE_URL + process.env.SAP_SERVICE_URL});
});


module.exports = router;