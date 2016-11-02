var mongoose = require('mongoose');

var vacationInSeasonlistenerSchema = mongoose.Schema({
    email: String,
    skus:[String]
});

var VacationInSeasonListener = mongoose.model('VacationInSeasonListener', vacationInSeasonlistenerSchema);
module.exports = VacationInSeasonListener;