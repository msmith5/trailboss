var express = require('express');
var app = express();

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/trailboss');

// Serve up static files
app.use(express.static('public'));
app.use(express.static('views'));

// Error handler
app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

//app.get('/', function (req, res) {
//    res.send('Hello World!');
//});

// Redirect to index
app.get('/', function (req, res) {
    res.redirect('/index.html');
});

// Start listening
app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
