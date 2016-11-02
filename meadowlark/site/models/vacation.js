var mongoose = require('mongoose');

//定义模式
var vacationSchema = mongoose.Schema({
    name: String,
    slug: String,
    category: String,
    sku: String,
    description: String,
    priceInCents: Number,
    tags: [String],
    inSeason: Boolean,
    available: Boolean,
    requiresWaiver: Boolean,
    maximumGuests: Number,
    notes: String,
    packagesSold: Number
});

vacationSchema.methods.getDisplayPrice = function() {
    return '$' + (this.priceInCents / 100).toFixed(2)
};

//通过模式创建模型类
var Vacation = mongoose.model('Vacation', vacationSchema);

module.exports = Vacation;