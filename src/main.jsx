import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import "tailwindcss";
import { BrowserRouter } from 'react-router-dom';
import MyUserProvider from './context/MyUserProvider.jsx';
import { StudioPanelProvider } from './context/StudioPanelContext.jsx';
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MyUserProvider>
      <StudioPanelProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StudioPanelProvider>
    </MyUserProvider>
  </StrictMode>
)
