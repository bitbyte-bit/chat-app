import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import axios from 'axios';
import '../styles/Profile.css';

const API_URL = 'http://localhost:4000/api';

const Profile: React.FC = () => {
  const { userId } = useParams<{ userId:  string }>();
  const { user:  currentUser, token } = useSelector((state:  RootState) => state.auth);
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    const targetUserId = userId || currentUser?.id;
    fetchProfile(targetUserId);
  }, [userId, currentUser]);

  const fetchProfile = async (id: string | number | undefined) => {
    if (! id) return;
    try {
      const response = await axios.get(`${API_URL}/profile/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data);
      setFormData(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateProfile = async () => {
    try {
      const response = await axios.put(
        `${API_URL}/profile/${currentUser?.id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProfile(response.data);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const shareProfile = () => {
    const profileLink = `${window.location.origin}/profile/${currentUser?.id}`;
    navigator.clipboard.writeText(profileLink);
    alert('Profile link copied to clipboard!');
  };

  if (!profile) return <div>Loading... </div>;

  return (
    <div className="profile-container">
      <div className="profile-card">
        {profile.profile_picture && (
          <img src={profile.profile_picture} alt="Profile" className="profile-picture" />
        )}

        {isEditing ?  (
          <div className="edit-form">
            <input
              value={formData.username || ''}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Username"
            />
            <textarea
              value={formData.bio || ''}
              onChange={(e) => setFormData({ ...formData, bio: e.target. value })}
              placeholder="Bio"
            />
            <button onClick={updateProfile}>Save</button>
            <button onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        ) : (
          <div className="profile-info">
            <h2>{profile.username}</h2>
            <p>{profile.bio}</p>
            <small>{profile.email}</small>

            {currentUser?. id === parseInt(userId || currentUser?.id) && (
              <div className="profile-actions">
                <button onClick={() => setIsEditing(true)}>Edit Profile</button>
                <button onClick={shareProfile}>Share Profile</button>
              </div>
            )}
          </div>