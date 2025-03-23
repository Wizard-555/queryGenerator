import styles from "./NavBar.module.css";
import { Link } from "react-router-dom";
import { useAuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
const Navbar = () => {
  const navigate = useNavigate();
  const { userState, UserLogout } = useAuthContext();
  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>QueryX</div>
      <ul className={styles.navLinks}>
        {!userState.token && (
          <>
            <li>
              <Link to="/login">Login</Link>
            </li>
            <li>
              <Link to="/signUp">Sign Up</Link>
            </li>
          </>
        )}
        {userState.name && (
          <li>
            <Link to="/profile">{userState.name}</Link>
          </li>
        )}
        {userState.token && (
          <li>
            <Link
              onClick={(e) => {
                UserLogout();
                navigate("/");
              }}
            >
              Logout
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
