import React, { useState } from 'react';

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

    const formData = new FormData();
    formData.append('image', uploadedImage);

    try {
      const response = await fetch('http://localhost:3001/api/recognize', {
        method: 'POST',
        body: formData,
      });

      setIsLoading(false);

      if (!response.ok) {
        const errorResult = await response.text(); // Use text() in case the response is not JSON
        setMessage(errorResult || 'Recognition failed.');
        return;
      }

      const result = await response.json();
      onRecognitionComplete(result);
      setMessage(result.message);
    } catch (error) {
      console.error('Error during face recognition:', error);
      setMessage('Recognition process error.');
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
