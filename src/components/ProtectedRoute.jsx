import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const accessToken = localStorage.getItem("accessToken");
  return accessToken ? children : (
    <Navigate to="/admin/crm/login" replace />
  );
}

export default ProtectedRoute;
