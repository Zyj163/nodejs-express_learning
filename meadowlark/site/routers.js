var main = require('./handlers/main.js');

module.exports = function(app){
    app.get('/about', main.about);
};