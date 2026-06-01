import { createSlice } from "@reduxjs/toolkit";

/**
 * unreadSlice
 *
 * Redux state shape:
 * {
 *   dm: { [friendId]: number },          // per-friend DM unread counts
 *   servers: {
 *     [serverId]: {
 *       total: number,                   // aggregate unread count for the server
 *       channels: { [channelId]: number } // per-channel unread counts
 *     }
 *   }
 * }
 *
 * Edge-case guarantees
 * --------------------
 * • Server totals are clamped to ≥ 0; they can never go negative regardless
 *   of the order in which clear actions arrive.
 * • Clearing a channel that has no unread count is a safe no-op.
 * • A server entry is removed from state only when its total truly reaches 0.
 */
export const unreadSlice = createSlice({
  name: "unread",
  initialState: {
    dm: {},
    servers: {},
  },
  reducers: {
    // Replace the entire unread summary (called after fetching from the server).
    set_unread_summary: (state, action) => {
      state.dm = action.payload.dm || {};
      state.servers = action.payload.servers || {};
    },

    // Increment the DM unread count for a friend.
    increment_dm_unread: (state, action) => {
      const { friend_id } = action.payload;
      state.dm[friend_id] = (state.dm[friend_id] || 0) + 1;
    },

    // Clear the DM unread count for a friend (safe if already absent).
    clear_dm_unread: (state, action) => {
      delete state.dm[action.payload.friend_id];
    },

    // Increment the unread count for a server channel.
    increment_server_unread: (state, action) => {
      const { server_id, channel_id } = action.payload;
      if (!state.servers[server_id]) {
        state.servers[server_id] = { total: 0, channels: {} };
      }

      state.servers[server_id].channels[channel_id] =
        (state.servers[server_id].channels[channel_id] || 0) + 1;

      state.servers[server_id].total += 1;
    },

    /**
     * Clear the unread count for a specific server channel.
     *
     * Steps:
     *  1. Guard: if the server or channel entry doesn't exist, return (no-op).
     *  2. Read the channel's current count.
     *  3. Delete the channel entry.
     *  4. Subtract that exact count from the server total, clamped to ≥ 0.
     *  5. Remove the server entry when total reaches 0.
     */
    clear_channel_unread: (state, action) => {
      const { server_id, channel_id } = action.payload;
      const server = state.servers[server_id];

      // Step 1 — no-op guard.
      if (!server || !server.channels[channel_id]) {
        return;
      }

      // Step 2 — capture the channel count before deleting.
      const channelCount = Math.max(0, server.channels[channel_id] || 0);

      // Step 3 — remove the channel entry.
      delete server.channels[channel_id];

      // Step 4 — subtract, then clamp total to ≥ 0.
      server.total = Math.max(0, server.total - channelCount);

      // Step 5 — clean up the server entry when there are no more unreads.
      if (server.total === 0) {
        delete state.servers[server_id];
      }
    },
  },
});

export const {
  set_unread_summary,
  increment_dm_unread,
  clear_dm_unread,
  increment_server_unread,
  clear_channel_unread,
} = unreadSlice.actions;

export default unreadSlice.reducer;
