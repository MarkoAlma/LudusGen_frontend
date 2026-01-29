import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import "tailwindcss";
import { BrowserRouter } from 'react-router-dom';
import MyUserProvider from './context/MyUserProvider.jsx';
createRoot(document.getElementById('root')).render(
  <MyUserProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </MyUserProvider>
)
