# IDENTIFEYE

IDENTIFEYE is a browser-based face recognition demonstration. Its original interface is preserved while enrollment and recognition now run entirely on the user's device, making the project compatible with GitHub Pages.

## Try the demo

The login is a presentation-only gate:

- Username: `admin`
- Password: `admin`

On the main screen:

1. Use **Add Profile** to enter a name, age, gender, and one or more clear photos of the same consenting person.
2. Use **Upload Image** to select a comparison photo.
3. Choose **Recognize Face** to find the nearest enrolled match.

## Privacy and limitations

Photos are processed locally in the browser and are not uploaded. Only face descriptors and the entered profile metadata are stored in that browser's local storage. Profiles do not sync between devices or browsers.

This is a portfolio demonstration, not identity verification. Do not use it for authentication, access control, surveillance, or safety-critical decisions. Only use photos with the subject's permission.

## Local development

Requires Node.js 20 or later.

```bash
npm ci
npm start
```

Open `http://localhost:3000`.

Run the automated checks and production build with:

```bash
npm run check
```

## GitHub Pages

The workflow in `.github/workflows/pages.yml` tests, builds, and publishes the app whenever `master` is pushed. In the repository's **Settings → Pages**, set **Source** to **GitHub Actions** once.

The intended public URL is:

`https://joseph-deluna.github.io/IDENTIFEYE/`

## How it works

- React keeps the original login and three-card interface.
- `face-api.js` performs face detection, landmarks, descriptor generation, and nearest-neighbor matching in the browser.
- Tiny Face Detector, tiny landmarks, and face-recognition weights are served from `public/models`.
- A hash-based route keeps navigation working from the `/IDENTIFEYE/` GitHub Pages path.

The legacy Express and MongoDB prototype remains in `backend/` for historical reference, but the published app does not execute or depend on it.
