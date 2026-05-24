import { createSlice } from "@reduxjs/toolkit";

export const user_creds = createSlice({
  name: "user_info",
  initialState: {
    username: "",
    tag: "",
    profile_pic: "",
    id: 0,
    invisible_mode: false,
    notification_preferences: {
      direct_messages: true,
      friend_requests: true,
      server_messages: true,
      server_invites: true,
    },
  },
  reducers: {
    change_username: (state, action) => {
      state.username = action.payload;
    },
    change_tag: (state, action) => {
      state.tag = action.payload;
    },
    option_profile_pic: (state, action) => {
      state.profile_pic = action.payload;
    },
    option_user_id: (state, action) => {
      state.id = action.payload;
    },
    set_invisible_mode: (state, action) => {
      state.invisible_mode = action.payload;
    },
    set_notification_preferences: (state, action) => {
      state.notification_preferences = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  change_username,
  change_tag,
  option_profile_pic,
  option_user_id,
  set_invisible_mode,
  set_notification_preferences,
} = user_creds.actions;

export default user_creds.reducer;
  