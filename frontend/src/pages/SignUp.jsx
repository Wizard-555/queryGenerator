import React, { useState } from "react";
import styles from "./SignUp.module.css";
import { useAuthContext } from "../contexts/AuthContext";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

const Signup = () => {
  const { UserLogin } = useAuthContext();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [dbName, setDbName] = useState("");
  const navigate = useNavigate();

  async function signUp() {
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, url, dbName }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Signup failed");
      }

      const data = await res.json();

      // Check if response contains token
      if (!data.token) {
        alert("Signup successful, but no token received.");
        return;
      }

      // Decode JWT Token correctly
      const decodedToken = jwtDecode(data.token);

      // Extract user details
      const userData = {
        name: decodedToken.name,
        token: data.token,
        url: decodedToken.url,
        dbName: decodedToken.dbName,
      };

      // Save user data to context
      UserLogin(userData);

      alert(`Welcome, ${decodedToken.name}!`);
      navigate("/dashboard");
    } catch (error) {
      console.error("Signup Error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Sign Up</h2>
        <div className={styles.form}>
          <input
            type="text"
            placeholder="Name"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
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
          <input
            type="text"
            placeholder="Database URL"
            className={styles.input}
            value={url}
            onChange={(e) => setUrl(decodeURIComponent(e.target.value))}
            disabled={loading}
          />
          <input
            type="text"
            placeholder="Enter DB Name (for NoSQL)"
            className={styles.input}
            value={dbName}
            onChange={(e) => setDbName(e.target.value)}
            disabled={loading}
          />
          <button
            className={styles.button}
            onClick={signUp}
            disabled={loading}
          >
            {loading ? "Signing Up..." : "Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Signup;