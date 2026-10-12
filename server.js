const express = require('express');
const generator = require('./routes/generator');
const processor = require('./routes/processor');
const validator = require('./routes/validator');
const variables = require('./routes/variables');
const sapproxy = require('./routes/sapproxy');
const path = require('path');

require("dotenv").config();

if (!process.env.JWT_PRIVATE_KEY) {
     console.log("FATAL ERROR: JWT key is not defined");
     process.exit(1);
}

//Create express app
const app = express();

//Set static page folder
app.use(express.static(path.join(__dirname, 'webapp')));

//Middleware usage
app.use(express.json());

//Process 
app.use('/api/generator', generator);
app.use('/api/processor', processor);
app.use('/api/validator', validator);
app.use('/api/variables', variables);
app.use('/proxy', sapproxy);

var https = require('https');
var http = require('http');
var fs = require('fs');

// This line is from the Node.js HTTPS documentation.
//var options = {
//  key: fs.readFileSync(path.join(__dirname,'/etc/cert/bmc.key')),
//  cert: fs.readFileSync(path.join(__dirname,'/etc/cert/bmc.cer'))
//};


app.listen(process.env.PORT, ()=>{
  console.log("App is running on port " + process.env.PORT);
});

// Create an HTTP service.
//http.createServer(app).listen(3000);
// Create an HTTPS service identical to the HTTP service.
//https.createServer(options, app).listen(process.env.PORT, ()=>{
//  console.log("App is running on port " + process.env.PORT)
//;});