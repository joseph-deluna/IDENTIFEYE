import {
  FaceInputError,
  createReferenceDescriptors,
  recognizeFaces,
} from './faceRecognition';

const descriptor = () => new Float32Array(128).fill(0.1);
let detections;

beforeEach(() => {
  detections = [];
  window.faceapi = {
    bufferToImage: jest.fn().mockResolvedValue({
      src: 'memory:test-image',
      naturalWidth: 800,
      naturalHeight: 600,
    }),
    TinyFaceDetectorOptions: jest.fn(),
    detectAllFaces: jest.fn(() => ({
      withFaceLandmarks: jest.fn(() => ({
        withFaceDescriptors: jest.fn(() => Promise.resolve(detections)),
      })),
    })),
    LabeledFaceDescriptors: jest.fn((label, descriptors) => ({ label, descriptors })),
    FaceMatcher: jest.fn(() => ({
      findBestMatch: jest.fn(() => ({ label: 'Alex', distance: 0.41 })),
    })),
  };
});

afterEach(() => {
  delete window.faceapi;
});

test('creates one numerical descriptor per valid reference photo', async () => {
  detections = [{ descriptor: descriptor() }];
  const files = [{ name: 'one.jpg' }, { name: 'two.jpg' }];
  const onProgress = jest.fn();

  const result = await createReferenceDescriptors(files, onProgress);

  expect(result).toHaveLength(2);
  expect(result[0]).toHaveLength(128);
  expect(onProgress).toHaveBeenLastCalledWith({ current: 2, total: 2, fileName: 'two.jpg' });
});

test('rejects a reference image containing more than one face', async () => {
  detections = [{ descriptor: descriptor() }, { descriptor: descriptor() }];

  await expect(createReferenceDescriptors([{ name: 'group.jpg' }])).rejects.toEqual(
    expect.objectContaining({ code: 'multiple-faces' })
  );
});

test('returns face boxes and nearest-match metadata for a query image', async () => {
  detections = [
    {
      descriptor: descriptor(),
      detection: { box: { x: 100, y: 80, width: 220, height: 240 } },
    },
  ];
  const profiles = [{ name: 'Alex', descriptors: [Array.from(descriptor())] }];

  const result = await recognizeFaces({ name: 'query.jpg' }, profiles);

  expect(result).toMatchObject({
    width: 800,
    height: 600,
    faces: [
      {
        label: 'Alex',
        isMatch: true,
        distance: 0.41,
        box: { x: 100, y: 80, width: 220, height: 240 },
      },
    ],
  });
  expect(window.faceapi.FaceMatcher).toHaveBeenCalledWith(expect.any(Array), 0.6);
});

test('uses a clear input error when no face is detected', async () => {
  await expect(
    createReferenceDescriptors([{ name: 'empty.jpg' }])
  ).rejects.toBeInstanceOf(FaceInputError);
});
