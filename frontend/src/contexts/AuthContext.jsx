import { useContext, createContext, useReducer } from "react";

const UserContext = createContext(null);

const initialUser = {
  name: localStorage.getItem("name") || null,
  token: localStorage.getItem("authToken") || null,
  url: localStorage.getItem("url") || null,
  dbName: localStorage.getItem("dbName") || null,
};

function userReducer(state, action) {
  const { type, payload } = action;
  switch (type) {
    case "LOGIN":
      return {
        ...state,
        name: payload.name,
        //role: payload.role,
        token: payload.token,
        url: payload.url,
        dbName: payload.dbName,
      };
    case "LOGOUT":
      localStorage.removeItem("name");
      localStorage.removeItem("authToken");
      return {
        ...state,
        name: null,
        //role: null,
        token: null,
        url: null,
        dbName: null,
      };
    //localStorage.removeItem("token");

    default:
      console.log("Unknown User Action");
  }
}
function AuthProvider({ children }) {
  const [userState, dispatch] = useReducer(userReducer, initialUser);
  function UserLogin(user) {
    dispatch({ type: "LOGIN", payload: user });
    localStorage.setItem("name", user.name);
    //localStorage.setItem("role", user.role)
    localStorage.setItem("authToken", user.token);
    localStorage.setItem("url", user.url);
    localStorage.setItem("dbName", user.dbName);
  }
  function UserLogout() {
    dispatch({ type: "LOGOUT" });
  }

  return (
    <UserContext.Provider value={{ UserLogin, UserLogout, userState }}>
      {children}
    </UserContext.Provider>
  );
}
function useAuthContext() {
  const { UserLogin, UserLogout, userState } = useContext(UserContext);
  return { UserLogin, UserLogout, userState };
}

export { AuthProvider, useAuthContext };
