import React, { useState } from "react";

const ORANGE = "#FF6B35";
const LIGHT_ORANGE = "#FFF1EB";
const BORDER = "#E5E5E5";

const sampleOrders = [
  {
    id: "ORD-001",
    customer: "John Doe",
    item: "Fresh Oranges",
    quantity: 10,
    status: "New Order",
    date: "2025-01-10",
  },
  {
    id: "ORD-002",
    customer: "Mary Wanjiku",
    item: "Tomatoes",
    quantity: 5,
    status: "On Progress",
    date: "2025-01-09",
  },
  {
    id: "ORD-003",
    customer: "Peter Kimani",
    item: "Bananas",
    quantity: 12,
    status: "Delivered",
    date: "2025-01-08",
  },
];

export default function OrdersView() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");

  const filteredOrders = sampleOrders
    .filter(order =>
      statusFilter === "All" ? true : order.status === statusFilter
    )
    .filter(order =>
      order.customer.toLowerCase().includes(search.toLowerCase()) ||
      order.id.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "date") return new Date(b.date) - new Date(a.date);
      if (sortBy === "customer") return a.customer.localeCompare(b.customer);
      return 0;
    });

  return (
    <div style={styles.page}>
      {/* Header */}
      <h2 style={styles.title}>View Orders</h2>

      {/* Nav Bar */}
      <div style={styles.navBar}>
        <input
          type="text"
          placeholder="Search orders..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.search}
        />

        <button style={styles.secondaryButton}>View Check-in Page</button>
        <button style={styles.logoutButton}>Logout</button>
      </div>

      {/* Status Filters */}
      <div style={styles.filters}>
        {["All", "New Order", "On Progress", "Delivered"].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            style={{
              ...styles.filterButton,
              backgroundColor:
                statusFilter === status ? ORANGE : "#fff",
              color: statusFilter === status ? "#fff" : "#333",
            }}
          >
            {status}
          </button>
        ))}

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={styles.sort}
        >
          <option value="date">Sort by Date</option>
          <option value="customer">Sort by Customer</option>
        </select>
      </div>

      {/* Orders Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
              <tr key={order.id} style={styles.tableRow}>
                <td>{order.id}</td>
                <td>{order.customer}</td>
                <td>{order.item}</td>
                <td>{order.quantity}</td>
                <td>
                  <span style={styles.statusBadge(order.status)}>
                    {order.status}
                  </span>
                </td>
                <td>{order.date}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredOrders.length === 0 && (
          <p style={styles.empty}>No orders found</p>
        )}
      </div>
    </div>
  );
}

/* ===================== STYLES ===================== */

const styles = {
  page: {
    padding: "24px",
    backgroundColor: "#FDFDFD",
    minHeight: "100vh",
    fontFamily: "Arial, sans-serif",
  },
  title: {
    textAlign: "center",
    marginBottom: "16px",
  },
  navBar: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    marginBottom: "16px",
  },
  search: {
    flex: 1,
    padding: "10px",
    borderRadius: "8px",
    border: `1px solid ${BORDER}`,
  },
  secondaryButton: {
    padding: "10px 14px",
    borderRadius: "8px",
    border: `1px solid ${ORANGE}`,
    backgroundColor: "#fff",
    color: ORANGE,
    cursor: "pointer",
  },
  logoutButton: {
    padding: "10px 14px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: ORANGE,
    color: "#fff",
    cursor: "pointer",
  },
  filters: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  filterButton: {
    padding: "8px 14px",
    borderRadius: "20px",
    border: `1px solid ${ORANGE}`,
    cursor: "pointer",
  },
  sort: {
    marginLeft: "auto",
    padding: "8px",
    borderRadius: "8px",
    border: `1px solid ${BORDER}`,
  },
  tableContainer: {
    border: `1px solid ${BORDER}`,
    borderRadius: "12px",
    padding: "16px",
    backgroundColor: "#fff",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tableHeader: {
    backgroundColor: LIGHT_ORANGE,
    textAlign: "left",
  },
  tableRow: {
    borderBottom: `1px solid ${BORDER}`,
  },
  statusBadge: status => ({
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    color: "#fff",
    backgroundColor:
      status === "Delivered"
        ? "#2ECC71"
        : status === "On Progress"
        ? "#F39C12"
        : ORANGE,
  }),
  empty: {
    textAlign: "center",
    marginTop: "12px",
    color: "#777",
  },
};
