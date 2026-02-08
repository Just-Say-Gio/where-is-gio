"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface FriendContextValue {
  friendId: number | null;
  displayName: string | null;
  isAuthed: boolean;
  setFriend: (id: number, name: string) => void;
  clearFriend: () => void;
}

const FriendContext = createContext<FriendContextValue>({
  friendId: null,
  displayName: null,
  isAuthed: false,
  setFriend: () => {},
  clearFriend: () => {},
});

export function useFriend() {
  return useContext(FriendContext);
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function FriendProvider({ children }: { children: ReactNode }) {
  const [friendId, setFriendId] = useState<number | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const token = getCookie("gio_session");
    if (token) {
      const storedName = localStorage.getItem("gio_friend_name");
      const storedId = localStorage.getItem("gio_friend_id");
      if (storedName && storedId) {
        setDisplayName(storedName);
        setFriendId(Number(storedId));
        setIsAuthed(true);
      }
    }
  }, []);

  const setFriend = (id: number, name: string) => {
    setFriendId(id);
    setDisplayName(name);
    setIsAuthed(true);
    localStorage.setItem("gio_friend_id", String(id));
    localStorage.setItem("gio_friend_name", name);
  };

  const clearFriend = () => {
    setFriendId(null);
    setDisplayName(null);
    setIsAuthed(false);
    localStorage.removeItem("gio_friend_id");
    localStorage.removeItem("gio_friend_name");
    document.cookie = "gio_session=; path=/; max-age=0";
  };

  return (
    <FriendContext.Provider value={{ friendId, displayName, isAuthed, setFriend, clearFriend }}>
      {children}
    </FriendContext.Provider>
  );
}
