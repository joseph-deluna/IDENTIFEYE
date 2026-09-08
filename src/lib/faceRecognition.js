export const MATCH_THRESHOLD = 0.6;

const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
const modelUrl = `${publicUrl}/models`;

let modelLoadPromise;

function getFaceApi() {
  if (typeof window === 'undefined' || !window.faceapi) {
    throw new Error('The face recognition library did not load. Refresh the page and try again.');
  }
  return window.faceapi;
}

function createDetectorOptions() {
  const faceapi = getFaceApi();
  return new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 });
}

export class FaceInputError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'FaceInputError';
    this.code = code;
  }
}

export function loadFaceModels() {
  if (!modelLoadPromise) {
    const faceapi = getFaceApi();
    modelLoadPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelUrl),
      faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl),
    ]).catch((error) => {
      modelLoadPromise = undefined;
      throw error;
    });
  }

  return modelLoadPromise;
}

async function imageFromFile(file) {
  const faceapi = getFaceApi();
  try {
    return await faceapi.bufferToImage(file);
  } catch (error) {
    throw new FaceInputError(
      `“${file.name}” could not be read. Choose a JPG, PNG, or WebP image.`,
      'unreadable-image'
    );
  }
}

async function detectionsForFile(file) {
  const faceapi = getFaceApi();
  const image = await imageFromFile(file);

  try {
    const detections = await faceapi
      .detectAllFaces(image, createDetectorOptions())
      .withFaceLandmarks(true)
      .withFaceDescriptors();

    return {
      detections,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    };
  } finally {
    if (image.src && image.src.startsWith('blob:')) URL.revokeObjectURL(image.src);
  }
}

export async function createReferenceDescriptors(files, onProgress) {
  const descriptors = [];

  for (let index = 0; index < files.length; index += 1) {
    onProgress?.({ current: index + 1, total: files.length, fileName: files[index].name });
    const { detections } = await detectionsForFile(files[index]);

    if (detections.length === 0) {
      throw new FaceInputError(
        `No face was found in “${files[index].name}”. Try a clear, well-lit portrait.`,
        'no-face'
      );
    }

    if (detections.length > 1) {
      throw new FaceInputError(
        `“${files[index].name}” contains more than one face. Use one person per reference photo.`,
        'multiple-faces'
      );
    }

    descriptors.push(Array.from(detections[0].descriptor));
  }

  return descriptors;
}

export async function recognizeFaces(file, profiles) {
  if (!profiles.length) {
    throw new FaceInputError('Enroll at least one profile before recognizing a face.', 'no-profiles');
  }

  const { detections, width, height } = await detectionsForFile(file);

  if (detections.length === 0) {
    throw new FaceInputError(
      'We could not find a face. Try a clearer, well-lit image where the face is visible.',
      'no-face'
    );
  }

  const faceapi = getFaceApi();
  const labeledDescriptors = profiles.map(
    (profile) =>
      new faceapi.LabeledFaceDescriptors(
        profile.name,
        profile.descriptors.map((descriptor) => new Float32Array(descriptor))
      )
  );
  const matcher = new faceapi.FaceMatcher(labeledDescriptors, MATCH_THRESHOLD);

  return {
    width,
    height,
    faces: detections.map((detection, index) => {
      const match = matcher.findBestMatch(detection.descriptor);
      const box = detection.detection.box;

      return {
        id: `${index}-${Math.round(box.x)}-${Math.round(box.y)}`,
        label: match.label,
        isMatch: match.label !== 'unknown',
        distance: match.distance,
        box: { x: box.x, y: box.y, width: box.width, height: box.height },
      };
    }),
  };
}
