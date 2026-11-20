import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Sistemas from './pages/Sistemas'
import Bestiario from './pages/Bestiario'
import Livros from './pages/Livros'
import Audio from './pages/Audio'
import Mesa from './pages/Mesa'
import Workspace from './workspace/Workspace'
import NewCampaign from './hub/NewCampaign'
import LibraryLayout from './library/LibraryLayout'

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
        <Route path="/nova-campanha" element={<NewCampaign />} />
        <Route path="/biblioteca" element={<LibraryLayout />}>
          <Route index element={<Navigate to="bestiario" replace />} />
          <Route path="bestiario" element={<Bestiario />} />
          <Route path="livros" element={<Livros />} />
          <Route path="audio" element={<Audio />} />
          <Route path="sistemas" element={<Sistemas />} />
        </Route>
      </Route>
    </Routes>
  )
}
