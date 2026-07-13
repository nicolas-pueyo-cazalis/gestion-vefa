import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Lots from './pages/Lots.jsx'
import Tma from './pages/Tma.jsx'
import Clients from './pages/Clients.jsx'
import AppelsDeFonds from './pages/AppelsDeFonds.jsx'
import Parametres from './pages/Parametres.jsx'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Lots />} />
        <Route path="clients" element={<Clients />} />
        <Route path="tma" element={<Tma />} />
        <Route path="appels-de-fonds" element={<AppelsDeFonds />} />
        <Route path="parametres" element={<Parametres />} />
      </Route>
    </Routes>
  )
}

export default App
