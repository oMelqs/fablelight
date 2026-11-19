import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Sistemas from './pages/Sistemas'
import Bestiario from './pages/Bestiario'
import Livros from './pages/Livros'
import Audio from './pages/Audio'
import Mesa from './pages/Mesa'
import Workspace from './workspace/Workspace'

// Old per-section campaign URLs now land in the workspace.
const ToWorkspace = () => <Navigate to={`/c/${useParams().id}`} replace />

export default function App() {
  return (
    <Routes>
      <Route path="/mesa" element={<Mesa />} />
      <Route path="/c/:id" element={<Workspace />} />
      <Route path="/c/:id/*" element={<ToWorkspace />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/biblioteca" element={<Navigate to="/biblioteca/sistemas" replace />} />
        <Route path="/biblioteca/sistemas" element={<Sistemas />} />
        <Route path="/biblioteca/bestiario" element={<Bestiario />} />
        <Route path="/biblioteca/livros" element={<Livros />} />
        <Route path="/biblioteca/audio" element={<Audio />} />
      </Route>
    </Routes>
  )
}
