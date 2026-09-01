import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
import ProfilePane from '../components/ProfilePane';
import GroupSettings from '../components/GroupSettings';
import { useAuth } from '../context/AuthContext';

const ChatPage = () => {
  const [selectedContact, setSelectedContact] = useState(null);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [returnStoryGroup, setReturnStoryGroup] = useState(null);
  const { user } = useAuth();

  if (!user) return null;

  const isGroup = selectedContact?.isGroup;

  return (
    <div className="app-container" style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {!selectedContact ? (
        <Sidebar 
          onSelectContact={(contact) => {
              setSelectedContact(contact);
              setShowContactInfo(!!contact.showInfo);
              if (contact.storyGroup) setReturnStoryGroup(contact.storyGroup);
          }} 
          selectedContact={selectedContact}
          initialStoryGroup={returnStoryGroup}
          onStoryGroupClosed={() => setReturnStoryGroup(null)}
        />
      ) : showContactInfo ? (
        isGroup ? (
          <GroupSettings 
            group={selectedContact} 
            onClose={() => setShowContactInfo(false)}
            onGroupUpdated={async () => {
              // Refresh group data when settings change
              try {
                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/groups/${selectedContact._id}`, {
                  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                if (res.ok) {
                  const updatedGroup = await res.json();
                  setSelectedContact(prev => ({ ...prev, ...updatedGroup }));
                }
              } catch (err) { console.error('Refresh group failed'); }
            }}
          />
        ) : (
          <ProfilePane 
            contact={selectedContact} 
            onClose={() => setShowContactInfo(false)} 
          />
        )
      ) : (
        <ChatArea 
          contact={selectedContact} 
          onBack={() => setSelectedContact(null)}
          onHeaderClick={() => setShowContactInfo(true)}
          onSelectContact={(contact) => {
              setSelectedContact(contact);
              setShowContactInfo(!!contact.showInfo);
              if (contact.storyGroup) setReturnStoryGroup(contact.storyGroup);
          }}
        />
      )}
    </div>
  );
};

export default ChatPage;
