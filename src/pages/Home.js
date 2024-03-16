import React, { useState } from 'react';
import SquareThree from '../components/SquareThree';
import SquareTwo from '../components/SquareTwo';
import SquareOne from '../components/SquareOne';

import '../App.css';

function Home() {
  // State and function moved inside the component
  const [uploadedImage, setUploadedImage] = useState(null);

  const handleImageUpload = (image) => {
    setUploadedImage(image);
  };

const [recognitionResult, setRecognitionResult] = useState(null);

const handleRecognitionComplete = (result) => {
  if (result.match) {
    setRecognitionResult(result.message); // Set a message to state instead of or in addition to using alert
  } else {
    alert(result.message); // Or update state to display 'no match' in the UI
  }
};

  return (
    <div>
    <div className="squares-container">
    <div className="App">
    
      <SquareOne onImageUpload={handleImageUpload} />
      <SquareTwo uploadedImage={uploadedImage} onRecognitionComplete={handleRecognitionComplete} />
      <SquareThree />
    </div>
    </div>
    </div>
  );
}

export default Home;
