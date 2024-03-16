const faceapi = require('face-api.js');
const canvas = require('canvas');
const { Canvas, Image, ImageData } = canvas;
const path = require('path');

// Patching the canvas and image implementations from the 'canvas' package
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Function to load models
async function loadModels() {
  const modelsPath = path.join(__dirname, '../models'); // Adjust this path
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);
  console.log('Models loaded successfully');
}

module.exports = { loadModels, faceapi, canvas };
