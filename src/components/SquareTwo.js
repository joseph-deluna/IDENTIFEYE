import React, { useCallback, useEffect, useRef, useState } from 'react';
import { loadStoredProfiles } from '../lib/profileStore';
import { loadFaceModels, recognizeFaces } from '../lib/faceRecognition';
import { loadProfileImage } from '../lib/profileImageStore';
import { waitForResultReveal } from '../lib/scanDelay';
import fallbackProfileImage from '../img/identifeye-logo-transparent.png';

const displayGender = (gender) => {
  if (!gender) return 'Not provided';
  return gender.charAt(0).toUpperCase() + gender.slice(1);
};

function SquareTwo({ uploadedImage, onRecognitionComplete }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [matchedProfile, setMatchedProfile] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const imageUrlRef = useRef('');
  const operationRef = useRef(0);

  const releaseProfileImage = useCallback(() => {
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = '';
    }
  }, []);

  useEffect(() => {
    operationRef.current += 1;
    releaseProfileImage();
    setProfileImageUrl('');
    setMatchedProfile(null);
    setMessage('');
    setIsLoading(false);
  }, [uploadedImage, releaseProfileImage]);

  useEffect(() => () => {
    operationRef.current += 1;
    releaseProfileImage();
  }, [releaseProfileImage]);

  const recognizeFace = async () => {
    if (!uploadedImage) {
      setMessage('Please upload an image first.');
      return;
    }

    const operationId = operationRef.current + 1;
    operationRef.current = operationId;
    releaseProfileImage();
    setProfileImageUrl('');
    setMatchedProfile(null);
    setMessage('');
    setIsLoading(true);

    let recognitionResult;
    let nextProfileImage = null;

    try {
      await loadFaceModels();
      const profiles = loadStoredProfiles();
      const result = await recognizeFaces(uploadedImage, profiles);
      const match = result.faces.find((face) => face.isMatch);

      if (match) {
        const storedProfile = profiles.find(
          (profile) => profile.name.toLocaleLowerCase() === match.label.toLocaleLowerCase()
        );
        const profile = storedProfile || {
          id: '',
          name: match.label,
          age: '',
          gender: '',
        };

        if (profile.id) {
          try {
            const image = await loadProfileImage(profile.id);
            if (image) nextProfileImage = image;
          } catch (imageError) {
            console.warn('Profile photo could not be loaded:', imageError);
          }
        }

        recognitionResult = {
          match: true,
          message: `Match found: ${match.label}`,
          profile,
        };
      } else {
        recognitionResult = { match: false, message: 'No match found.' };
      }
    } catch (error) {
      console.error('Error during face recognition:', error);
      recognitionResult = {
        match: false,
        message: error.message || 'Recognition process error.',
      };
    }

    await waitForResultReveal();

    if (operationId !== operationRef.current) {
      return;
    }

    let nextImageUrl = '';
    if (nextProfileImage) {
      try {
        nextImageUrl = URL.createObjectURL(nextProfileImage);
      } catch (imageError) {
        console.warn('Profile photo could not be displayed:', imageError);
      }
    }

    if (nextImageUrl) imageUrlRef.current = nextImageUrl;
    setProfileImageUrl(nextImageUrl);
    setMatchedProfile(recognitionResult.profile || null);
    setMessage(recognitionResult.message);
    setIsLoading(false);
    onRecognitionComplete?.(recognitionResult);
  };

  return (
    <div className="square square-two">
      {isLoading ? (
        <div className="face-recognition-animation" role="status" aria-live="polite">
          <span className="panel-number">02 · SCANNING</span>
          <h4>Looking for a match in your profiles</h4>
          <p>Processing securely on this device</p>
          <div className="face-placeholder" aria-hidden="true"></div>
          <div className="scanner-line" aria-hidden="true"></div>
        </div>
      ) : matchedProfile ? (
        <div className="match-result" aria-live="polite">
          <span className="result-badge">Match found</span>
          <img
            className={`profile-result-image${profileImageUrl ? '' : ' fallback'}`}
            src={profileImageUrl || fallbackProfileImage}
            alt={profileImageUrl
              ? `${matchedProfile.name}'s enrolled profile`
              : `No saved profile photo for ${matchedProfile.name}`}
          />
          <h2>{matchedProfile.name}</h2>
          <dl>
            <div><dt>Age</dt><dd>{matchedProfile.age || 'Not provided'}</dd></div>
            <div><dt>Gender</dt><dd>{displayGender(matchedProfile.gender)}</dd></div>
          </dl>
          <button type="button" onClick={recognizeFace}>Scan again</button>
        </div>
      ) : (
        <div className="recognition-prompt">
          <span className="panel-number">02 · MATCH</span>
          <span className="recognition-icon" aria-hidden="true"></span>
          <h2>Recognize Face</h2>
          <p>{uploadedImage ? 'Your image is ready to scan.' : 'Upload a comparison image to begin recognition.'}</p>
          <button type="button" onClick={recognizeFace} disabled={!uploadedImage}>Recognize Face</button>
          {message && <p className="recognition-message" role="status">{message}</p>}
        </div>
      )}
    </div>
  );
}

export default SquareTwo;
