const fs = require('fs');
const path = require('path');

const modelsDirectory = path.join(__dirname, '..', 'public', 'models');
const browserLibrary = path.join(__dirname, '..', 'public', 'vendor', 'face-api.min.js');

if (!fs.existsSync(browserLibrary)) {
  throw new Error('The face-api.js browser library is missing from public/vendor.');
}

const manifests = [
  'tiny_face_detector_model-weights_manifest.json',
  'face_landmark_68_tiny_model-weights_manifest.json',
  'face_recognition_model-weights_manifest.json',
];

const missing = [];

for (const manifestName of manifests) {
  const manifestPath = path.join(modelsDirectory, manifestName);
  if (!fs.existsSync(manifestPath)) {
    missing.push(manifestName);
    continue;
  }
  const groups = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  for (const group of groups) {
    for (const shardName of group.paths || []) {
      if (!fs.existsSync(path.join(modelsDirectory, shardName))) {
        missing.push(`${manifestName} -> ${shardName}`);
      }
    }
  }
}

if (missing.length) {
  throw new Error(`Missing model shards:\n${missing.join('\n')}`);
}

console.log(`Verified ${manifests.length} face-api.js model manifests.`);
