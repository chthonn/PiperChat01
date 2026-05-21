import { createSlice } from "@reduxjs/toolkit";

export const unreadSlice = createSlice({
  name: "unread",
  initialState: {
    dm: {},
    servers: {},
  },
  reducers: {
    set_unread_summary: (state, action) => {
      state.dm = action.payload.dm || {};
      state.servers = action.payload.servers || {};
    },
    increment_dm_unread: (state, action) => {
      const friendId = action.payload.friend_id;
      state.dm[friendId] = (state.dm[friendId] || 0) + 1;
    },
    clear_dm_unread: (state, action) => {
      delete state.dm[action.payload.friend_id];
    },
    increment_server_unread: (state, action) => {
      const { server_id, channel_id } = action.payload;
      if (!state.servers[server_id]) {
        state.servers[server_id] = { total: 0, channels: {} };
      }

      state.servers[server_id].total += 1;
      state.servers[server_id].channels[channel_id] =
        (state.servers[server_id].channels[channel_id] || 0) + 1;
    },
    clear_channel_unread: (state, action) => {
      const { server_id, channel_id } = action.payload;
      const server = state.servers[server_id];
      if (!server || !server.channels[channel_id]) {
        return;
      }

      const channelCount = server.channels[channel_id];
      if (typeof channelCount !== "number") {
        delete server.channels[channel_id];
        return;
      }

      server.total -= channelCount;
      delete server.channels[channel_id];

      if (server.total <= 0) {
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
