// Entry point: fonts, global styles, React mount. Nothing else.
// Fonts are self-hosted via Fontsource so the site makes zero
// third-party requests (and Pages serves everything from one origin).
import '@fontsource-variable/anybody/wdth.css' // display face: wght 100–900, wdth 50–150%
import '@fontsource-variable/martian-mono' // data/body face: wght 100–800
import './styles/tokens.css'
import './styles/base.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
