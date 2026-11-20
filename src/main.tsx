import { createRoot } from 'react-dom/client'
import { App } from './App'
import '@fontsource-variable/dm-sans'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/fraunces/wght-italic.css'
import './styles.css'
import './journeys.css'
import './motion.css'

createRoot(document.getElementById('root')!).render(<App />)
