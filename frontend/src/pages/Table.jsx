import styles from "./Table.module.css";

const Table = ({ data }) => {
  return (
    <div className={styles.tableContainer}>
      {Object.entries(data).map(([collectionName, rows], idx) => (
        <div key={idx} className={styles.tableWrapper}>
          <h2 className={styles.tableTitle}>{collectionName}</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                {rows.length > 0
                  ? Object.keys(rows[0]).map((col, i) => <th key={i}>{col}</th>)
                  : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {Object.values(row).map((value, colIndex) => (
                    <td key={colIndex}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default Table;