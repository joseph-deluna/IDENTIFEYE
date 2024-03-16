const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const Profile = require('./models/Profile');
const { canvas, faceapi, loadModels } = require('./faceApiConfig');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/faceRecognitionApp', { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => console.log("Connected to MongoDB"))
.catch(err => console.error("Could not connect to MongoDB:", err));

// Load face-api.js models
loadModels().then(() => {
  console.log("Models are loaded");
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => console.error("Failed to load models:", err));

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Route to create profiles
app.post('/api/profiles', upload.array('images'), async (req, res) => {
  const { name, age, gender } = req.body;
  const images = req.files.map(file => file.filename);
  
  try {
    const newProfile = await Profile.create({ name, age, gender, images });
    res.status(201).json(newProfile);
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).send('Error creating profile');
  }
});

// Asynchronous function to preload all profile images and their descriptors
async function loadProfileDescriptors() {
  const profiles = await Profile.find({});
  const labeledDescriptors = await Promise.all(
    profiles.map(async (profile) => {
      const descriptors = await Promise.all(
        profile.images.map(async (imagePath) => {
          const img = await canvas.loadImage(`./uploads/${imagePath}`);
          const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
          if (detection) {
            return new Float32Array(Object.values(detection.descriptor));
          }
          return null;
        })
      );
      const validDescriptors = descriptors.filter(descriptor => descriptor !== null);
      if (validDescriptors.length > 0) {
        return new faceapi.LabeledFaceDescriptors(profile.name, validDescriptors);
      } else {
        return null;
      }
    })
  );
  return labeledDescriptors.filter(descriptor => descriptor !== null);
}



// Route to recognize faces
app.post('/api/recognize', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No image uploaded.');
  }
  
  try {
    const labeledDescriptors = await loadProfileDescriptors();
    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
    
    const queryImage = await canvas.loadImage(req.file.path);
    const queryDetections = await faceapi.detectSingleFace(queryImage).withFaceLandmarks().withFaceDescriptor();
    
    if (!queryDetections) {
      fs.unlinkSync(req.file.path); // Clean up uploaded image
      return res.status(404).send('No faces found in the uploaded image.');
    }
    
    const bestMatch = faceMatcher.findBestMatch(queryDetections.descriptor);
    fs.unlinkSync(req.file.path); // Clean up uploaded image
    
    if (bestMatch.label === 'unknown') {
      res.json({ match: false, message: 'No match found.' });
    } else {
      res.json({ match: true, message: `Match found: ${bestMatch.label}` });
    }
  } catch (error) {
    console.error('Recognition error:', error);
    res.status(500).send('Error during recognition process.');
  }
});



// Listen on the port
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
