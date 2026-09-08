import React, { useEffect, useRef, useState } from 'react';

function SquareOne({ onImageUpload }) {
  const [imageUrl, setImageUrl] = useState('');
  const readerRef = useRef(null);
  const selectionRef = useRef(0);

  useEffect(() => () => {
    selectionRef.current += 1;
    if (readerRef.current?.readyState === FileReader.LOADING) {
      readerRef.current.abort();
    }
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    const selection = selectionRef.current + 1;
    selectionRef.current = selection;

    if (readerRef.current?.readyState === FileReader.LOADING) {
      readerRef.current.abort();
    }

    if (file) {
      const reader = new FileReader();
      readerRef.current = reader;
      onImageUpload(file);
      reader.onload = () => {
        if (selection === selectionRef.current) setImageUrl(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setImageUrl('');
      onImageUpload(null);
    }
  };

  return (
    <div className="square square-one">
      <input 
        type="file" 
        onChange={handleImageChange} 
        accept="image/*" 
        className="file-input"
        id="fileInput"
        aria-label="Upload comparison image"
      />
      <label htmlFor="fileInput" className="square-content">
        {imageUrl ? (
          <div className="upload-preview">
            <img src={imageUrl} alt="Selected comparison" className="uploaded-image" />
            <span className="change-photo">Choose a different photo</span>
          </div>
        ) : (
          <div className="upload-prompt">
            <span className="panel-number">01 · INPUT</span>
            <span className="upload-icon" aria-hidden="true">+</span>
            <h2>Upload Image</h2>
            <p>Select a clear, front-facing photo to compare against your saved profiles.</p>
            <span className="upload-cta">Choose a photo</span>
          </div>
        )}
      </label>
    </div>
  );
}

export default SquareOne;
