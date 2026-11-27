import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
const Login = lazy(() => import("./pages/Login"));
const Cadastro = lazy(() => import("./pages/Cadastro"));
const Mapa = lazy(() => import("./pages/mapa"));
const DashboardBarbeiro = lazy(() => import("./pages/DashboardBarbeiro"));
const CadastrarBarbearia = lazy(() => import("./pages/CadastrarBarbearia"));
const EditarBarbearia = lazy(() => import("./pages/EditarBarbearia"));
const Agendamento = lazy(() => import("./pages/Agendamento"));
const CorteUrgente = lazy(() => import("./pages/CorteUrgente"));
const Avaliacao = lazy(() => import("./pages/Avaliacao"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const MeusCortes = lazy(() => import("./pages/MeusCortes"));
const AgendaBarbeiro = lazy(() => import("./pages/AgendaBarbeiro"));
const Favoritos = lazy(() => import("./pages/Favoritos"));
const Perfil = lazy(() => import("./pages/Perfil"));
const Admin = lazy(() => import("./pages/Admin"));
const NaoEncontrado = lazy(() => import("./pages/NaoEncontrado"));
import { getUsuarioLogado } from "./api";
import { ErrorBoundary } from "./components/ErrorBoundary";

function RotaProtegida({ children, tipo, admin = false }) {
  const usuario = getUsuarioLogado();

  if (!usuario) {
    return <Navigate to="/" replace />;
  }

  if (tipo && usuario.tipo !== tipo) {
    return (
      <Navigate
        to={usuario.tipo === "barbeiro" ? "/barbeiro" : "/mapa"}
        replace
      />
    );
  }

  if (admin && !usuario.admin) {
    return <Navigate to={usuario.tipo === "barbeiro" ? "/barbeiro" : "/mapa"} replace />;
  }

  return children;
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<main className="bc-route-loading" role="status" aria-live="polite">Carregando BarberConnect...</main>}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/admin" element={<RotaProtegida admin><Admin /></RotaProtegida>} />
          <Route
            path="/meus-cortes"
            element={
              <RotaProtegida tipo="cliente">
                <MeusCortes />
              </RotaProtegida>
            }
          />
          <Route
            path="/barbeiro/portfolio"
            element={
              <RotaProtegida tipo="barbeiro">
                <Portfolio />
              </RotaProtegida>
            }
          />
          <Route
            path="/barbeiro/agenda"
            element={
              <RotaProtegida tipo="barbeiro">
                <AgendaBarbeiro />
              </RotaProtegida>
            }
          />
          <Route
            path="/mapa"
            element={
              <RotaProtegida tipo="cliente">
                <Mapa />
              </RotaProtegida>
            }
          />
          <Route
            path="/urgente"
            element={
              <RotaProtegida tipo="cliente">
                <CorteUrgente />
              </RotaProtegida>
            }
          />
          <Route
            path="/avaliacao"
            element={
              <RotaProtegida tipo="cliente">
                <Avaliacao />
              </RotaProtegida>
            }
          />
          <Route
            path="/agendamento"
            element={
              <RotaProtegida tipo="cliente">
                <Agendamento />
              </RotaProtegida>
            }
          />
          <Route
            path="/favoritos"
            element={
              <RotaProtegida tipo="cliente">
                <Favoritos />
              </RotaProtegida>
            }
          />
          <Route
            path="/perfil"
            element={
              <RotaProtegida tipo="cliente">
                <Perfil />
              </RotaProtegida>
            }
          />
          <Route
            path="/barbeiro/perfil"
            element={
              <RotaProtegida tipo="barbeiro">
                <Perfil />
              </RotaProtegida>
            }
          />
          <Route
            path="/barbeiro"
            element={
              <RotaProtegida tipo="barbeiro">
                <DashboardBarbeiro />
              </RotaProtegida>
            }
          />
          <Route
            path="/barbeiro/cadastrar"
            element={
              <RotaProtegida tipo="barbeiro">
                <CadastrarBarbearia />
              </RotaProtegida>
            }
          />
          <Route
            path="/barbeiro/editar"
            element={
              <RotaProtegida tipo="barbeiro">
                <EditarBarbearia />
              </RotaProtegida>
            }
          />
          <Route path="*" element={<NaoEncontrado />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
