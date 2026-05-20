import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Hash, Volume2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { change_page_id, change_page_name } from "../../../store/currentPage";
import { useParams } from "react-router-dom";
import { clear_channel_unread } from "../../../store/unreadSlice";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";

function ServerDetails({ new_req_recieved, elem, onNavigate }) {
  const dispatch = useDispatch();
  const [show, setShow] = useState(false);
  const [selectedValue, setSelectedValue] = useState("text");
  const [category_name, setcategory_name] = useState("");
  const [new_channel_name, setnew_channel_name] = useState("");
  const url = import.meta.env.VITE_URL;
  const [channel_creation_progess, setchannel_creation_progess] = useState({
    text: "Create Channel",
    disabled: false,
  });
  const { server_id } = useParams();
  const unreadServer = useSelector((state) => state.unread.servers[server_id]);

  const handleClose = () => {
    setShow(false);
    setchannel_creation_progess({ text: "Create Channel", disabled: false });
  };
  const handleShow = () => setShow(true);

  const [show_channels, setshow_channels] = useState(true);

  function make_channels_visible() {
    setshow_channels((prev) => !prev);
  }

  const create_channel = async () => {
    const res = await fetch(`${url}/add_new_channel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        channel_name: new_channel_name,
        category_id: elem._id,
        channel_type: selectedValue,
        server_id: server_id,
      }),
    });
    const data = await res.json();
    if (data.status == 200) {
      new_req_recieved(1);
      handleClose();
    }
  };

  function change_channel(channel_type, channel_name, channel_id) {
    if (channel_type == "text") {
      dispatch(change_page_name(channel_name));
      dispatch(change_page_id(channel_id));
      onNavigate?.();
      dispatch(clear_channel_unread({ server_id, channel_id }));
      fetch(`${url}/mark_channel_read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": localStorage.getItem("token"),
        },
        body: JSON.stringify({ server_id, channel_id }),
      });
    }
  }

  return (
    <>
      <div className="mt-3">
        <div className="flex items-center justify-between px-3">
          <button
            type="button"
            className="flex items-center gap-2 text-xs font-extrabold tracking-widest text-white/45 hover:text-white/75"
            onClick={make_channels_visible}
          >
            {show_channels ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            {elem.category_name}
          </button>
          <button
            type="button"
            onClick={() => {
              handleShow();
              setcategory_name(elem.category_name);
            }}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            title="Create channel"
            aria-label="Create channel"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {show_channels ? (
          <div className="mt-2 space-y-1 px-2">
            {elem.channels.map((channel_elem) => {
              const unread = unreadServer?.channels?.[channel_elem._id];
              const isText = channel_elem.channel_type == "text";

              return (
                <button
                  type="button"
                  key={channel_elem._id}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-transparent px-3 py-2 text-left text-sm font-semibold text-white/75 transition hover:border-white/10 hover:bg-white/5"
                  onClick={() =>
                    change_channel(
                      channel_elem.channel_type,
                      channel_elem.channel_name,
                      channel_elem._id
                    )
                  }
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {isText ? (
                      <Hash className="h-4 w-4 text-white/50" />
                    ) : (
                      <Volume2 className="h-4 w-4 text-white/50" />
                    )}
                    <span className="truncate">{channel_elem.channel_name}</span>
                  </span>
                  {unread ? (
                    <span className="grid h-6 min-w-6 place-items-center rounded-full bg-brand-400 px-2 text-[11px] font-black text-black">
                      {unread}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <Dialog open={show} onOpenChange={(open) => (open ? setShow(true) : handleClose())}>
        <DialogContent>
          <DialogTitle>Create channel</DialogTitle>
          <DialogDescription className="mt-2">
            In <span className="font-semibold text-white/80">{category_name}</span>
          </DialogDescription>

          <div className="mt-4 space-y-3">
            <div className="text-xs font-extrabold tracking-widest text-white/45">
              CHANNEL TYPE
            </div>
            <div className="grid gap-2">
              <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-start gap-3">
                  <Hash className="mt-0.5 h-5 w-5 text-brand-300" />
                  <div>
                    <div className="text-sm font-extrabold text-white/85">
                      Text
                    </div>
                    <div className="text-xs text-white/55">
                      Send messages, images, GIFs, emoji
                    </div>
                  </div>
                </div>
                <input
                  type="radio"
                  name="channel-type"
                  value="text"
                  checked={selectedValue === "text"}
                  onChange={() => setSelectedValue("text")}
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-start gap-3">
                  <Volume2 className="mt-0.5 h-5 w-5 text-neon-cyan" />
                  <div>
                    <div className="text-sm font-extrabold text-white/85">
                      Voice
                    </div>
                    <div className="text-xs text-white/55">
                      Hang out together with voice and screen share
                    </div>
                  </div>
                </div>
                <input
                  type="radio"
                  name="channel-type"
                  value="voice"
                  checked={selectedValue === "voice"}
                  onChange={() => setSelectedValue("voice")}
                />
              </label>
            </div>

            <div className="text-xs font-extrabold tracking-widest text-white/45">
              CHANNEL NAME
            </div>
            <Input
              value={new_channel_name}
              onChange={(e) => setnew_channel_name(e.target.value)}
              placeholder="new-channel"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={channel_creation_progess.disabled}
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={channel_creation_progess.disabled || !new_channel_name.trim()}
              onClick={() => {
                create_channel();
                setchannel_creation_progess({
                  ...channel_creation_progess,
                  text: "Creating…",
                  disabled: true,
                });
              }}
            >
              {channel_creation_progess.text}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ServerDetails;
