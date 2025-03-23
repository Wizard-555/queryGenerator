import React, { useState } from "react";
import styles from "./SignUp.module.css";
import { useAuthContext } from "../contexts/AuthContext";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { useNavigate } from "react-router-dom";
const Login = () => {
  const { UserLogin } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // Indicator State
  const navigate = useNavigate();
  async function signIn() {
    setLoading(true); // Show indicator

    try {
      const res = await axios.post(
        "http://localhost:5000/auth/login",
        { email, password }, // ✅ Corrected JSON body
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (res.data.error) {
        alert(res.data.error);
        return;
      }

      // ✅ Decode JWT Token correctly
      const decodedToken = jwtDecode(res.data);

      // ✅ Extract user details correctly
      const userData = {
        name: decodedToken.name,
        token: res.data,
        url: decodedToken.url,
        dbName: decodedToken.dbName,
      };

      // ✅ Save user data to context
      UserLogin(userData);

      alert(`Welcome, ${decodedToken.name}!`);
      navigate("/dashboard");
    } catch (error) {
      console.error("Login Error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false); // Hide indicator
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Sign In</h2>
        <div className={styles.form}>
          <input
            type="email"
            placeholder="Email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <button
            className={styles.button}
            onClick={signIn}
            disabled={loading} // Disable button while loading
          >
            {loading ? "Logging In..." : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
