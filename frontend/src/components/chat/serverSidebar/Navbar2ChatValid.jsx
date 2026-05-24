import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { logout } from "../../../lib/logout";
import ServerDetails from "../serverDetails/ServerDetails";
import { useDispatch, useSelector } from "react-redux";
import {
  change_page_id,
  server_members,
  change_page_name,
  server_role,
} from "../../../store/currentPage";
import {
  ChevronDown,
  FolderPlus,
  LogOut,
  Trash2,
  UserPlus,
  DoorOpen,
  Copy,
  X,
} from "lucide-react";
import { update_options } from "../../../store/optionsSlice";
import { API_BASE_URL } from "../../../config";
import socket from "../../socket/Socket";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";

function Navbar2ChatValid({ onNavigate }) {
  const url = API_BASE_URL;
  const { server_id } = useParams();
  const Navigate = useNavigate();

  const username = useSelector((state) => state.user_info.username);
  const id = useSelector((state) => state.user_info.id);
  const activeChannelId = useSelector((state) => state.currentPage.page_id);

  const front_end_url = import.meta.env.VITE_FRONT_END_URL;

  const [show, setShow] = useState(false);
  const handleClose = () => {
    setShow(false);
    setcategory_creation_progress({ text: "Create Category", disabled: false });
  };

  const [inviteshow, setinviteshow] = useState(false);
  const handle_inviteClose = () => setinviteshow(false);
  const [show_options, setshow_options] = useState("none");
  const [server_details, setserver_details] = useState([]);
  const serverRole = useSelector((state) => state.currentPage.role);
  const dispatch = useDispatch();
  const [new_category_name, setnew_category_name] = useState("");
  const [category_creation_progress, setcategory_creation_progress] = useState({
    text: "Create Category",
    disabled: false,
  });
  const [invite_link, setinvite_link] = useState("");

  useEffect(() => {
    setinvite_link("");
    setshow_options("none");
  }, [server_id]);

  const [new_req, setnew_req] = useState(1);
  const new_req_recieved = (new_req_value) => {
    setnew_req(new_req + new_req_value);
  };

  const create_invite_link = async () => {
    const res = await fetch(`${url}/invites/create_invite_link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        inviter_name: username,
        inviter_id: id,
        server_name: server_details.server_name,
        server_id: server_id,
        server_pic: server_details.server_pic,
      }),
    });
    const data = await res.json();
    if (data.status == 200) {
      setinvite_link(`${front_end_url}/invite/${data.invite_code}`);
    }
  };

  const delete_server = async () => {
    const res = await fetch(`${url}/servers/delete_server`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        server_id,
      }),
    });
    const data = await res.json();
    if (data.status == 200) {
      dispatch(update_options());
      Navigate("/channels/@me");
    }
  };

  const leave_server = async () => {
    const res = await fetch(`${url}/servers/leave_server`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        server_id,
      }),
    });
    const data = await res.json();
    if (data.status == 200) {
      dispatch(update_options());
      Navigate("/channels/@me");
    }
  };

  function change_options_visibility() {
    if (show_options == "none") {
      setshow_options("block");
    } else {
      setshow_options("none");
    }
  }

  const server_info = useCallback(async () => {
    const res = await fetch(`${url}/servers/server_info`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        server_id,
      }),
    });
    const data = await res.json();
    if (!Array.isArray(data) || !data[0]) {
      dispatch(update_options());
      Navigate("/channels/@me");
      return;
    }

    const server = data[0];
    setserver_details(server);
    dispatch(server_members(server.users || []));
    const currentMember = (server.users || []).find(
      (member) => String(member.user_id) === String(id),
    );
    dispatch(server_role(currentMember?.user_role || ""));

    const channels = (server.categories || []).flatMap((category) =>
      (category.channels || []).map((channel) => ({
        id: channel._id,
        name: channel.channel_name,
      }))
    );

    const channelStillExists = activeChannelId
      ? channels.some((channel) => String(channel.id) === String(activeChannelId))
      : false;

    if (!channelStillExists) {
      const nextChannel = channels[0];
      if (nextChannel?.id) {
        dispatch(change_page_name(nextChannel.name));
        dispatch(change_page_id(nextChannel.id));
      }
    }
  }, [Navigate, activeChannelId, dispatch, id, server_id, url]);

  const create_category = async () => {
    const res = await fetch(`${url}/servers/add_new_category`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        category_name: new_category_name,
        server_id: server_id,
      }),
    });
    const data = await res.json();
    if (data.status == 200) {
      server_info();
      handleClose();
    }
  };

  useEffect(() => {
    server_info();
  }, [new_req, server_info]);

  useEffect(() => {
    if (!server_id || server_id === "@me") {
      return;
    }
    socket.emit("join_server", server_id);
  }, [server_id]);

  useEffect(() => {
    const handleServerUpdated = ({ server_id: updatedServerId }) => {
      if (String(updatedServerId) !== String(server_id)) {
        return;
      }
      server_info();
    };

    socket.on("server_updated", handleServerUpdated);
    return () => {
      socket.off("server_updated", handleServerUpdated);
    };
  }, [server_id, server_info]);

  return (
    <>
      <div className="relative">
        {show_options !== "none" ? (
          <div className="absolute left-3 right-3 top-14 z-30 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/90 shadow-soft backdrop-blur-xl">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/5"
              onClick={() => {
                if (invite_link.length == 0) {
                  create_invite_link();
                }
                setinviteshow(true);
                setshow_options("none");
              }}
            >
              Invite people
              <UserPlus className="h-4 w-4 text-white/60" />
            </button>

            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/5"
              onClick={() => {
                setShow(true);
                setshow_options("none");
              }}
            >
              Create category
              <FolderPlus className="h-4 w-4 text-white/60" />
            </button>

            {serverRole == "author" ? (
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/10"
                onClick={() => {
                  setshow_options("none");
                  delete_server();
                }}
              >
                Delete server
                <Trash2 className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/10"
                onClick={() => {
                  setshow_options("none");
                  leave_server();
                }}
              >
                Leave server
                <DoorOpen className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/5"
              onClick={logout}
            >
              Logout
              <LogOut className="h-4 w-4 text-white/60" />
            </button>
          </div>
        ) : null}

        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 border-b border-white/10 bg-black/25 px-4 py-3 text-left"
          onClick={change_options_visibility}
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-extrabold text-white/90">
              {server_details.server_name || "Server"}
            </div>
            <div className="mt-0.5 text-xs font-semibold text-white/45">
              {serverRole === "author" ? "Owner" : "Member"}
            </div>
          </div>
          {show_options == "none" ? (
            <ChevronDown className="h-5 w-5 text-white/60" />
          ) : (
            <X className="h-5 w-5 text-white/60" />
          )}
        </button>

        {server_details.length == 0 ? null : (
          <div className="px-1 pb-2">
            {server_details.categories.map((elem) => (
              <ServerDetails
                key={elem._id}
                new_req_recieved={new_req_recieved}
                elem={elem}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={show} onOpenChange={(open) => (open ? setShow(true) : handleClose())}>
        <DialogContent>
          <DialogTitle>Create category</DialogTitle>
          <DialogDescription className="mt-2">
            Add a new category to{" "}
            <span className="font-semibold text-white/80">
              {server_details.server_name}
            </span>
            .
          </DialogDescription>
          <div className="mt-4 space-y-2">
            <div className="text-xs font-extrabold tracking-widest text-white/45">
              CATEGORY NAME
            </div>
            <Input
              value={new_category_name}
              onChange={(e) => setnew_category_name(e.target.value)}
              placeholder="new-category"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={category_creation_progress.disabled}
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                category_creation_progress.disabled || !new_category_name.trim()
              }
              onClick={() => {
                create_category();
                setcategory_creation_progress({
                  ...category_creation_progress,
                  text: "Creating…",
                  disabled: true,
                });
              }}
            >
              {category_creation_progress.text}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteshow} onOpenChange={(open) => (open ? setinviteshow(true) : handle_inviteClose())}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Invite friends</DialogTitle>
          <DialogDescription className="mt-2">
            Invite friends to{" "}
            <span className="font-semibold text-white/80">
              {server_details.server_name}
            </span>
            .
          </DialogDescription>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-extrabold tracking-widest text-white/45">
              SERVER INVITE LINK
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 truncate rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80">
                {invite_link.length == 0 ? (
                  <span className="text-white/45">Generating…</span>
                ) : (
                  invite_link
                )}
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigator.clipboard.writeText(invite_link)}
                disabled={!invite_link}
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Navbar2ChatValid;
