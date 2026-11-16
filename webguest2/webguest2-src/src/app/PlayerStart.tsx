import React, { FC, FormEvent, useEffect, useState } from "react";
import "./player.css";

export const PlayerStart: FC = () => {
  useEffect(() => {
    document.documentElement.classList.add("standalone-page");
    return () => document.documentElement.classList.remove("standalone-page");
  }, []);
  const [playerId, setPlayerId] = useState("");
  const openPlayer = (event: FormEvent) => {
    event.preventDefault();
    const id = playerId.trim();
    if (id) window.location.assign(`/player/${encodeURIComponent(id)}${window.location.search}`);
  };

  return (
    <main className="player-start">
      <form className="player-start-card" onSubmit={openPlayer}>
        <span className="player-start-brand">Medialooks</span>
        <h1>Remote player</h1>
        <p>Enter the Player ID shown in the C# Remote Control Player sample.</p>
        <label htmlFor="player-id">Player ID</label>
        <input
          id="player-id"
          name="playerId"
          value={playerId}
          onChange={event => setPlayerId(event.target.value)}
          placeholder="Player-PC"
          autoComplete="off"
          autoFocus={window.matchMedia("(hover: hover) and (pointer: fine)").matches}
          required
        />
        <button type="submit" disabled={!playerId.trim()}>Open player</button>
      </form>
    </main>
  );
};
