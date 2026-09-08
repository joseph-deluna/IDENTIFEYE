import React, { useEffect, useState } from 'react';
import Login from './pages/Login';
import Home from './pages/Home';
import './App.css';

const getRoute = () => window.location.hash.replace(/^#/, '') || '/';

function App() {
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    const handleHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const openHome = () => {
    window.location.hash = '/home';
    setRoute('/home');
  };

  const logOut = () => {
    window.location.hash = '/';
    setRoute('/');
  };

  return route === '/home' ? <Home onLogout={logOut} /> : <Login onLogin={openHome} />;
}

export default App;
