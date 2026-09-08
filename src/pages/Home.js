import React, { useState } from 'react';
import SquareThree from '../components/SquareThree';
import SquareTwo from '../components/SquareTwo';
import SquareOne from '../components/SquareOne';
import navLogo from '../img/identifeye-logo-transparent.png';

import '../App.css';

function Home({ onLogout }) {
  const [uploadedImage, setUploadedImage] = useState(null);

  const handleImageUpload = (image) => {
    setUploadedImage(image);
  };

  const [, setRecognitionResult] = useState(null);

  const handleRecognitionComplete = (result) => {
    setRecognitionResult(result.message);
  };

  return (
    <div className="home-page">
      <nav className="navbar" aria-label="Main navigation">
        <div className="navbar-inner">
          <div className="navbar-brand">
            <img className="navbar-logo" src={navLogo} alt="" />
            <span>IDENTIFEYE</span>
          </div>
          <button className="logout-button" type="button" onClick={onLogout}>Log out</button>
        </div>
      </nav>
      <main className="workspace" aria-label="Face recognition workspace">
        <div className="squares-container">
          <div className="App">
            <SquareOne onImageUpload={handleImageUpload} />
            <SquareTwo uploadedImage={uploadedImage} onRecognitionComplete={handleRecognitionComplete} />
            <SquareThree />
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;
