import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchUserGroups, createGroup, joinGroup } from '../store/slices/groupsSlice';
import { RootState, AppDispatch } from '../store';
import '../styles/Groups.css';

const Groups: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { token } = useSelector((state: RootState) => state.auth);
  const { groups, loading } = useSelector((state: RootState) => state.groups);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', password: '' });

  useEffect(() => {
    dispatch(fetchUserGroups(token! ));
  }, [token, dispatch]);

  const handleCreateGroup = async (e: React. FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(createGroup({ ... formData, token })).unwrap();
      setFormData({ name: '', description: '', password: '' });
      setShowCreateForm(false);
      dispatch(fetchUserGroups(token! ));
    } catch (error) {
      console.error('Create group error:', error);
    }
  };

  return (
    <div className="groups-container">
      <h1>Group Chats</h1>
      <button onClick={() => setShowCreateForm(! showCreateForm)}>+ Create Group</button>

      {showCreateForm && (
        <form onSubmit={handleCreateGroup} className="group-form">
          <input
            type="text"
            placeholder="Group Name"
            value={formData. name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <textarea
            placeholder="Description"
            value={formData. description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <input
            type="password"
            placeholder="Group Password (optional)"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target. value })}
          />
          <button type="submit">Create</button>
          <button type="button" onClick={() => setShowCreateForm(false)}>Cancel</button>
        </form>
      )}

      {loading ?  (
        <p>Loading groups...</p>
      ) : (
        <div className="groups-list">
          {groups.map((group) => (
            <div key={group.id} className="group-card">
              <h3>{group.name}</h3>
              <p>{group.description}</p>
              <small>Created: {new Date(group.created_at).toLocaleDateString()}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Groups;