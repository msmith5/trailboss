var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var routeSchema = new Schema({
    _id: String,
    name: String,
    description: String,
    zoom: Number,
    center: {
        lat: Number,
        lng: Number
    },
    created: Date,
    updated: Date
});

// on every save, add the date
routeSchema.pre('save', function(next) {
    // get the current date
    var currentDate = new Date();

    // change the updated_at field to current date
    this.update = currentDate;

    // if created_at doesn't exist, add to that field
    if (!this.created)
        this.created = currentDate;

    next();
});

// the schema is useless so far
// we need to create a model using it
var Route = mongoose.model('Route', routeSchema);

// make this available to our routes in our Node applications
module.exports = Route;
