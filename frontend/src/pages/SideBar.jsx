import styles from "./SideBar.module.css";
import { useAuthContext } from "../contexts/AuthContext";
import { useEffect, useState } from "react";
import axios from "axios";

const Sidebar = ({ setDbData }) => {
  const { userState } = useAuthContext();
  const [dbDetails, setDbDetails] = useState({});

  useEffect(() => {
    async function connectDB() {
      if (!userState?.url) return;

      try {
        const response = await axios.post(
          "http://localhost:5000/data/connect-db",
          {
            dbUrl: encodeURIComponent(userState.url),
            dbName: userState.dbName || null, // Handle SQL without dbName
          },
          { headers: { "Content-Type": "application/json" } }
        );

        setDbDetails(response?.data?.details || {});
      } catch (error) {
        console.error("Error connecting to DB:", error);
      }
    }

    connectDB();
  }, [userState]);

  // **🔹 Handle Sidebar Click**
  const handleClick = async (collectionName) => {
    if (!userState?.url) return;

    try {
      let response;
      if (userState.dbName) {
        // Fetch MongoDB documents dynamically
        response = await axios.get("http://localhost:5000/data/allDocuments", {
          params: {
            connectionUrl: encodeURIComponent(userState.url),
            collectionName,
          },
        });
      } else {
        // Fetch MySQL table data dynamically
        response = await axios.get("http://localhost:5000/data/allDataInTables", {
          params: {
            connectionUrl: encodeURIComponent(userState.url),
            tableName: collectionName,
          },
        });
      }

      const fetchedData = response.data || [];
      console.log(response)
      setDbData({ [collectionName]: fetchedData });
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  return (
    <div className={styles.sidebar}>
      <ul>
        <li className={styles.active}>{userState?.dbName || "No Database"}</li>
        {dbDetails?.collections?.map((collection, index) => (
          <li key={index} onClick={() => handleClick(collection.name)}>
            {collection.name || `Collection ${index + 1}`}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;