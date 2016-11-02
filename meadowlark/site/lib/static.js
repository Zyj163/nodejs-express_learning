var credentials = require('./credentials.js');

exports.map = function(name){
    return credentials.baseUrl + name
};