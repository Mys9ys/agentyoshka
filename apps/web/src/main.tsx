import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/comfortaa/cyrillic-600.css'
import '@fontsource/comfortaa/cyrillic-700.css'
import '@fontsource/comfortaa/cyrillic-ext-600.css'
import '@fontsource/comfortaa/cyrillic-ext-700.css'
import '@fontsource/comfortaa/latin-600.css'
import '@fontsource/comfortaa/latin-700.css'
import '@fontsource/nunito/cyrillic-600.css'
import '@fontsource/nunito/cyrillic-700.css'
import '@fontsource/nunito/cyrillic-800.css'
import '@fontsource/nunito/cyrillic-ext-600.css'
import '@fontsource/nunito/cyrillic-ext-700.css'
import '@fontsource/nunito/cyrillic-ext-800.css'
import '@fontsource/nunito/latin-600.css'
import '@fontsource/nunito/latin-700.css'
import '@fontsource/nunito/latin-800.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
