import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import RouteProtegee from './components/RouteProtegee.jsx'
import RouteProgramme from './components/RouteProgramme.jsx'
import Connexion from './pages/Connexion.jsx'
import ChoixProgramme from './pages/ChoixProgramme.jsx'
import TableauDeBord from './pages/TableauDeBord.jsx'
import Lots from './pages/Lots.jsx'
import Tma from './pages/Tma.jsx'
import Clients from './pages/Clients.jsx'
import AppelsDeFonds from './pages/AppelsDeFonds.jsx'
import SuiviPret from './pages/SuiviPret.jsx'
import SignatureActe from './pages/SignatureActe.jsx'
import Parametres from './pages/Parametres.jsx'

function App() {
  return (
    <Routes>
      <Route path="connexion" element={<Connexion />} />
      <Route element={<RouteProtegee />}>
        <Route path="programmes" element={<ChoixProgramme />} />
        <Route element={<RouteProgramme />}>
          <Route element={<Layout />}>
            <Route index element={<TableauDeBord />} />
            <Route path="lots" element={<Lots />} />
            <Route path="clients" element={<Clients />} />
            <Route path="tma" element={<Tma />} />
            <Route path="appels-de-fonds" element={<AppelsDeFonds />} />
            <Route path="suivi-pret" element={<SuiviPret />} />
            <Route path="signature-acte" element={<SignatureActe />} />
            <Route path="parametres" element={<Parametres />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}

export default App
