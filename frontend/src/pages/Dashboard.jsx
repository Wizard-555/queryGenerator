import { useState, useEffect } from "react";
import axios from "axios";
import styles from "./Dashboard.module.css";
import Sidebar from "./Sidebar";
import Table from "./Table";
import { useAuthContext } from "../contexts/AuthContext";

const Dashboard = () => {
  const [dbData, setDbData] = useState({}); // Holds structured API data
  const [userQuery, setUserQuery] = useState(""); // Stores user input
  const [submittedQuery, setSubmittedQuery] = useState(null); // Tracks submitted query for useEffect
  const [loading, setLoading] = useState(false); // Tracks API loading state
  const { userState } = useAuthContext();

  // Effect to fetch data when query is submitted
  useEffect(() => {
    if (!submittedQuery) return; // Avoid running if no query is submitted

    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await axios.post("http://localhost:5000/data/nl-to-nosql-new", {
          userQuery: submittedQuery,
          dbUrl: userState.url,
          dbName: userState.dbName,
        });

        if (response.data) {
          setDbData(response.data); // Update table with API response
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [submittedQuery]); // Runs only when submittedQuery changes

  // Function to trigger query submission
  const handleQuerySubmit = () => {
    if (!userQuery.trim()) return;
    setSubmittedQuery(userQuery); // Triggers useEffect
  };

  return (
    <div className={styles.dashboardContainer}>
      <Sidebar setDbData={setDbData} />

      <div className={styles.mainContent}>
        <h1 className={styles.heading}>Dashboard</h1>

        {/* User Query Input */}
        <div className={styles.queryInputContainer}>
          <input
            type="text"
            className={styles.queryInput}
            placeholder="Enter your query..."
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
          />
          <button
            className={styles.queryButton}
            onClick={handleQuerySubmit}
            disabled={loading} // Prevents spam clicks
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {/* Display Table */}
        {Object.keys(dbData).length > 0 ? (
          <Table data={dbData} />
        ) : (
          <p className={styles.noDataMessage}>No data available.</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
