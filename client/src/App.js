import React from 'react';
import { Routes, Route } from "react-router-dom";
import CallPage from './Components/Screen/Call/CallPage';
import HomePage from './Components/Screen/Home/HomePage';

const App = () => {
  return (
    <div>
      <Routes>
        <Route exact path="/" element={<CallPage />} />
        {/* <Route exact path="/callpage" element={<CallPage />} /> */}
      </Routes>
    </div>
  );
};

export default App;