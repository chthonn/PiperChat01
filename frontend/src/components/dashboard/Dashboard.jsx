import { useCallback, useEffect, useState } from "react";
import Navbar from "../navbar/Navbar";
import Navbar2 from "../sidebar/Navbar2";
import TopNav from "../header/TopNav";
import Main from "../main/Main";
import RightNav from "../membersPanel/RightNav";
import jwt from "jwt-decode";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  change_username,
  change_tag,
  option_profile_pic,
  option_user_id,
  set_notification_preferences,
} from "../../store/userCredsSlice";
import { server_existence } from "../../store/currentPage";
import { API_BASE_URL } from "../../config";
import { resolveProfilePic } from "../../shared/imageFallbacks";
import { Sheet, SheetContent } from "../ui/sheet";

function Dashboard() {
  const dispatch = useDispatch();
  const { server_id } = useParams();
  const isDashboard = server_id === "@me" || server_id === undefined;

  // Select user info from Redux for real-time reactivity
  const {
    username: reduxUsername,
    profile_pic: reduxProfilePic
  } = useSelector((state) => state.user_info);

  const option_state = useSelector(
    (state) => state.selected_option.updated_options
  );
  const url = API_BASE_URL;

  const [user_data, setuser_data] = useState({
    incoming_reqs: [],
    outgoing_reqs: [],
    friends: [],
    servers: [],
  });
  const [status, setstatus] = useState({
    pending_status: false,
    online_status: false,
    all_friends_status: false,
    blocked_staus: false,
  });
  const [new_req, setnew_req] = useState(1);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const new_req_recieved = (new_req_value) => {
    setnew_req((current) => current + new_req_value);
  };

  const user_relations = useCallback(async () => {
    try {
      const res = await fetch(`${url}/user_relations`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": localStorage.getItem("token"),
        },
      });
      const data = await res.json();

      const incoming_reqs = Array.isArray(data.incoming_reqs)
        ? data.incoming_reqs
        : [];
      const outgoing_reqs = Array.isArray(data.outgoing_reqs)
        ? data.outgoing_reqs
        : [];
      const friends = Array.isArray(data.friends) ? data.friends : [];
      const servers = Array.isArray(data.servers) ? data.servers : [];

      const pending = incoming_reqs.length + outgoing_reqs.length;
      let status_2 = {
        pending_status: false,
        online_status: false,
        all_friends_status: false,
        blocked_staus: false,
      };

      if (pending !== 0) {
        status_2 = { ...status_2, pending_status: true };
      } else {
        status_2 = { ...status_2, pending_status: false };
      }

      if (friends.length !== 0) {
        status_2 = { ...status_2, all_friends_status: true };
      } else {
        status_2 = { ...status_2, all_friends_status: false };
      }

      setstatus(status_2);
      setuser_data({
        incoming_reqs,
        outgoing_reqs,
        friends,
        servers,
      });
    } catch {
      setstatus({
        pending_status: false,
        online_status: false,
        all_friends_status: false,
        blocked_staus: false,
      });
      setuser_data({
        incoming_reqs: [],
        outgoing_reqs: [],
        friends: [],
        servers: [],
      });
    }
  }, [url]);

  useEffect(() => {
    user_relations();
  }, [new_req, option_state, user_relations]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [server_id]);

  useEffect(() => {
    if (server_id !== "@me" && server_id !== undefined) {
      let does_exists = false;
      for (let index = 0; index < user_data.servers.length; index++) {
        if (server_id === user_data.servers[index].server_id) {
          does_exists = true;
        }
      }
      dispatch(server_existence(does_exists));
    }
  }, [dispatch, server_id, user_data.servers]);

  // Initial load of user info from token (only on mount)
  useEffect(() => {
    let token = localStorage.getItem("token");
    if (token) {
      try {
        const user_creds = jwt(token);
        const { username, tag, profile_pic, id, notification_preferences } = user_creds;

        dispatch(change_username(username));
        dispatch(change_tag(tag));
        dispatch(option_profile_pic(resolveProfilePic(profile_pic, username)));
        dispatch(option_user_id(id));

        dispatch(
          set_notification_preferences({
            direct_messages: true,
            friend_requests: true,
            server_messages: true,
            server_invites: true,
            ...notification_preferences,
          }),
        );
      } catch (err) {
        console.error("Failed to decode token", err);
      }
    }
  }, [dispatch]);

  return (
    <div className="relative h-dvh overflow-hidden bg-ink text-white">
      <div className="pointer-events-none absolute inset-0 bg-radial-glow" />
      <div className="pointer-events-none absolute inset-0 bg-grid-fade [background-size:36px_36px] opacity-15" />

      <div
        className={[
          "relative mx-auto grid h-dvh w-full max-w-[1680px]",
          "grid-rows-[56px_1fr]",
          "grid-cols-1",
          "lg:grid-cols-[72px_minmax(240px,280px)_minmax(0,1fr)]",
          !isDashboard
            ? "xl:grid-cols-[72px_minmax(260px,300px)_minmax(0,1fr)_minmax(320px,340px)]"
            : "xl:grid-cols-[72px_minmax(260px,300px)_minmax(0,1fr)]",
          !isDashboard
            ? "2xl:grid-cols-[72px_minmax(280px,320px)_minmax(0,1fr)_minmax(340px,380px)]"
            : "2xl:grid-cols-[72px_minmax(280px,320px)_minmax(0,1fr)]",
        ].join(" ")}
      >
        <div className="hidden lg:block row-span-2 row-start-1 border-r border-white/10 bg-black/35">
          <Navbar
            user_cred={{
              username: reduxUsername,
              profile_pic: reduxProfilePic,
              user_servers: user_data.servers
            }}
            new_req_recieved={new_req_recieved}
          />
        </div>

        <div
          className={[
            "row-span-2 row-start-1 border-r border-white/10 bg-black/20",
            "hidden lg:block",
          ].join(" ")}
        >
          <Navbar2 friends={user_data.friends} />
        </div>

        <div className="col-start-1 row-start-1 lg:col-start-3">
          <TopNav
            onToggleSidebar={() => setMobileSidebarOpen((current) => !current)}
            button_status={{
              pending: status.pending_status,
              pending_count:
                user_data.incoming_reqs.length + user_data.outgoing_reqs.length,
              all_friends: status.all_friends_status,
            }}
          />
        </div>

        {!isDashboard ? (
          <div className="hidden xl:block xl:col-start-4 xl:row-start-1 xl:row-span-2">
            <RightNav />
          </div>
        ) : null}

        <div className="col-start-1 row-start-2 min-w-0 overflow-hidden lg:col-start-3 lg:col-span-1 lg:row-start-2">
          <Main
            user_relations={{
              incoming_reqs: user_data.incoming_reqs,
              outgoing_reqs: user_data.outgoing_reqs,
              friends: user_data.friends,
            }}
          />
        </div>

        {/* Mobile nav drawer (servers + sidebar) */}
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent
            side="left"
            className="p-0 overflow-hidden"
          >
            <div className="flex h-dvh w-full">
              <div className="w-[72px] border-r border-white/10 bg-black/35">
                <Navbar
                  user_cred={{
                    username: reduxUsername,
                    profile_pic: reduxProfilePic,
                    user_servers: user_data.servers
                  }}
                  new_req_recieved={new_req_recieved}
                  onNavigate={() => setMobileSidebarOpen(false)}
                />
              </div>
              <div className="min-w-0 flex-1 bg-black/20">
                <Navbar2
                  friends={user_data.friends}
                  onNavigate={() => setMobileSidebarOpen(false)}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

export default Dashboard;