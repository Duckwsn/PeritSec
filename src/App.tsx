import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { RequireAuth } from './components/RequireAuth'
import { AuthProvider } from './context/AuthContext'
import { ProgressProvider } from './context/ProgressContext'
import { AccountPage } from './pages/AccountPage'
import { AdminPage } from './pages/AdminPage'
import { CasePage } from './pages/CasePage'
import { CasesPage } from './pages/CasesPage'
import { CryptoLabPage } from './pages/CryptoLabPage'
import { DashboardPage } from './pages/DashboardPage'
import { LabsPage } from './pages/LabsPage'
import { LessonPage } from './pages/LessonPage'
import { LoginPage } from './pages/LoginPage'
import { MethodologyPage } from './pages/MethodologyPage'
import { NetworkLabPage } from './pages/NetworkLabPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ProgressPage } from './pages/ProgressPage'
import { RecoverPage } from './pages/RecoverPage'
import { RegisterPage } from './pages/RegisterPage'
import { TrackPage } from './pages/TrackPage'
import { TracksPage } from './pages/TracksPage'
import { TrafficLabPage } from './pages/TrafficLabPage'
import { WelcomePage } from './pages/WelcomePage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProgressProvider>
          <Routes>
            <Route path="entrar" element={<LoginPage />} />
            <Route path="criar-conta" element={<RegisterPage />} />
            <Route path="recuperar" element={<RecoverPage />} />

            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route index element={<DashboardPage />} />
                <Route path="comecar" element={<WelcomePage />} />
                <Route path="conta" element={<AccountPage />} />
                <Route path="trilhas" element={<TracksPage />} />
                <Route path="trilhas/:trackId" element={<TrackPage />} />
                <Route path="licoes/:lessonId" element={<LessonPage />} />
                <Route path="laboratorios" element={<LabsPage />} />
                <Route path="laboratorio/redes" element={<NetworkLabPage />} />
                <Route path="laboratorio/trafego" element={<TrafficLabPage />} />
                <Route path="laboratorio/cripto" element={<CryptoLabPage />} />
                <Route path="casos" element={<CasesPage />} />
                <Route path="casos/:caseId" element={<CasePage />} />
                <Route path="progresso" element={<ProgressPage />} />
                <Route path="metodologia" element={<MethodologyPage />} />
                <Route path="admin" element={<AdminPage />} />
                <Route path="nao-encontrado" element={<NotFoundPage />} />
                <Route path="*" element={<Navigate to="/nao-encontrado" replace />} />
              </Route>
            </Route>
          </Routes>
        </ProgressProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
