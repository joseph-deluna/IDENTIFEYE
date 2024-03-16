const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  name: String,
  age: Number,
  gender: String,
  images: [String], // Store image file paths
});

module.exports = mongoose.model('Profile', profileSchema);
