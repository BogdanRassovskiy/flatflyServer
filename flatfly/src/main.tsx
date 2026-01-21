import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import {BrowserRouter} from "react-router-dom";
import {LanguageProvider} from "./contexts/LanguageContext";
import {AuthProvider} from "./contexts/AuthContext";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <BrowserRouter>
          <LanguageProvider>
              <AuthProvider>
                  <App />
              </AuthProvider>
          </LanguageProvider>
      </BrowserRouter>
  </StrictMode>,
)
