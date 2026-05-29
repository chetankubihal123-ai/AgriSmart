import React, { createContext, useContext, useState } from 'react';

type Role = 'farmer' | 'expert' | null;

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
  isHost: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<Role>(() => {
    const savedRole = localStorage.getItem('user_role');
    return (savedRole as Role) || 'farmer';
  });

  const isHost = role === 'expert';

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    if (newRole) {
      localStorage.setItem('user_role', newRole);
    } else {
      localStorage.removeItem('user_role');
    }
  };

  return (
    <RoleContext.Provider value={{ role, setRole, isHost }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
