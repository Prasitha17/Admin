import { useState, useEffect } from "react";
import axios from "axios";

export default function ManageUsers({ users, onDelete, onEdit }) {
  const [localUsers, setLocalUsers] = useState(users);
  const [showActionsFor, setShowActionsFor] = useState(null);

  useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  const handleApproveReject = async (email, status) => {
    try {
      await axios.patch(`/users/${email.toLowerCase()}/approval`, {
        isApproved: status,
      });
      const updated = localUsers.map(user =>
        user.email === email ? { ...user, isApproved: status } : user
      );
      setLocalUsers(updated);
      setShowActionsFor(null);
    } catch (err) {
      alert("❌ Failed to update approval status.");
      console.error(err);
    }
  };

  return (
    <div className="manage-users">
      {localUsers.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Category</th>
              <th>Email Verified</th>
              <th>Approval Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {localUsers.map(user => (
              <tr key={user.email}>
                <td>{user.firstName} {user.lastName}</td>
                <td>{user.email}</td>
                <td>{user.category}</td>
                <td>{user.emailVerified ? 'Yes' : 'No'}</td>
                <td>
                  {user.isApproved === "approved" && "✅ Approved"}
                  {user.isApproved === "rejected" && "❌ Rejected"}

                  {user.isApproved === "pending" && showActionsFor !== user.email && (
                    <button onClick={() => setShowActionsFor(user.email)}>
                      ⏳ Pending
                    </button>
                  )}

                  {user.isApproved === "pending" && showActionsFor === user.email && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                      <button onClick={() => handleApproveReject(user.email, "approved")}>
                        ✅ Approve
                      </button>
                      <button onClick={() => handleApproveReject(user.email, "rejected")}>
                        ❌ Reject
                      </button>
                    </div>
                  )}
                </td>

                <td>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => onEdit(user)}>Edit</button>
                    <button onClick={() => onDelete(user.email)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
