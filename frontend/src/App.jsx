import { AuthProvider, useAuthContext } from "./contexts/AuthContext.jsx";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import SignUp from "./pages/SignUp.jsx";
import Login from "./pages/Login.jsx";
import {
  Outlet,
  Navigate,
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import "./App.css"; // Keep styles if needed

function Layout() {
  return (
    <div>
      <NavBar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { userState } = useAuthContext();
  return userState?.token ? children : <Navigate to="/login" />;
}

function AuthRedirect({ children }) {
  const { userState } = useAuthContext();
  return userState?.token ? <Navigate to="/dashboard" /> : children;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        path: "signUp",
        element: (
          <AuthRedirect>
            <SignUp />
          </AuthRedirect>
        ),
      },
      {
        path: "login",
        element: (
          <AuthRedirect>
            <Login />
          </AuthRedirect>
        ),
      },
      {
        path: "dashboard",
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;