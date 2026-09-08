import React, { useState } from 'react';
import { loadStoredProfiles } from '../lib/profileStore';
import { loadFaceModels, recognizeFaces } from '../lib/faceRecognition';

function SquareTwo({ uploadedImage, onRecognitionComplete }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const recognizeFace = async () => {
    setIsLoading(true);
    setMessage('');
    if (!uploadedImage) {
      setMessage('Please upload an image first.');
      setIsLoading(false);
      return;
    }

    try {
      await loadFaceModels();
      const profiles = loadStoredProfiles();
      const result = await recognizeFaces(uploadedImage, profiles);
      const match = result.faces.find((face) => face.isMatch);
      let recognitionResult;

      if (match) {
        recognitionResult = {
          match: true,
          message: `Match found: ${match.label}`,
        };
      } else {
        recognitionResult = { match: false, message: 'No match found.' };
      }

      onRecognitionComplete?.(recognitionResult);
      setMessage(recognitionResult.message);
    } catch (error) {
      console.error('Error during face recognition:', error);
      setMessage(error.message || 'Recognition process error.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="square">
      {isLoading ? (
        <div className="face-recognition-animation">
          <h4>Looking for a Match in the Database</h4>
        <div className="face-placeholder"></div>
        <div className="scanner-line"></div>
      </div>
        
      ) : (
        <button onClick={recognizeFace} disabled={!uploadedImage}>
          Recognize Face
        </button>
      )}
      <p>{message}</p>
    </div>
  );
}

export default SquareTwo;
