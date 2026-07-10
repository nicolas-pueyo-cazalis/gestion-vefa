import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Lots from './pages/Lots.jsx'
import Tma from './pages/Tma.jsx'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Lots />} />
        <Route path="tma" element={<Tma />} />
      </Route>
    </Routes>
  )
}

export default App
